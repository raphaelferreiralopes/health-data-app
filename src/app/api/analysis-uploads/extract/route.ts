import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { getGeminiServerClient } from '@/app/lib/geminiServer';
import { serverError } from '@/app/lib/apiError';
import { MAX_UPLOAD_PDF_BYTES, parsePdfDataUrl } from '../shared';

// Guardrails for the Gemini API call this route makes. Gemini's free tier is
// rate-limited (requests/day and requests/minute), so a per-user daily cap
// keeps one account from exhausting the shared quota for everyone else.
const DAILY_EXTRACTION_LIMIT = 10;
// Structured JSON output for a full-panel PDF (30+ Parameter) easily runs to
// a few thousand tokens -- 2048 was too tight and silently truncated the
// JSON mid-array, which surfaced as a generic parse error to the user.
const MAX_OUTPUT_TOKENS = 8192;
const MODEL = 'gemini-3.1-flash-lite';

type ExtractPayload = {
  fileData?: string;
  fileName?: string;
};

type LabParameterRow = {
  id: string;
  key: string;
  name: string;
  abbreviation: string | null;
  unit: string | null;
  result_type: 'numeric' | 'qualitative';
};

type ExtractedResult = {
  parameter_key: string;
  value_numeric: number | null;
  value_qualitative: string | null;
  measured_at: string | null;
};

function buildCatalogText(parameters: LabParameterRow[]): string {
  return parameters
    .map((p) => {
      const label = p.abbreviation ? `${p.name} (${p.abbreviation})` : p.name;
      const unit = p.unit ? `, Einheit: ${p.unit}` : '';
      return `${p.key} | ${label} | Werttyp: ${p.result_type}${unit}`;
    })
    .join('\n');
}

function buildSchema(validKeys: string[]) {
  return {
    type: Type.OBJECT,
    properties: {
      results: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            parameter_key: { type: Type.STRING, enum: validKeys },
            value_numeric: { type: Type.NUMBER, nullable: true },
            value_qualitative: { type: Type.STRING, nullable: true },
            measured_at: { type: Type.STRING, nullable: true },
          },
          required: ['parameter_key', 'value_numeric', 'value_qualitative', 'measured_at'],
        },
      },
    },
    required: ['results'],
  } as const;
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as ExtractPayload;
  const parsedPdf = parsePdfDataUrl(body.fileData ?? '');

  if (!parsedPdf) {
    return NextResponse.json({ error: 'Es wird eine PDF-Datei erwartet.' }, { status: 400 });
  }
  if (parsedPdf.approxBytes > MAX_UPLOAD_PDF_BYTES) {
    return NextResponse.json(
      { error: `Datei zu groß (max. ${Math.floor(MAX_UPLOAD_PDF_BYTES / (1024 * 1024))} MB für die automatische Auswertung).` },
      { status: 400 },
    );
  }
  const { base64 } = parsedPdf;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentCount, error: countError } = await supabase
    .from('pdf_extractions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (countError) {
    return serverError('extract rate-limit check failed', countError);
  }
  if ((recentCount ?? 0) >= DAILY_EXTRACTION_LIMIT) {
    return NextResponse.json(
      { error: `Tageslimit erreicht (max. ${DAILY_EXTRACTION_LIMIT} automatische Auswertungen pro Tag). Bitte versuche es morgen erneut.` },
      { status: 429 },
    );
  }

  const { data: parameterRows, error: parameterError } = await supabase
    .from('lab_parameters')
    .select('id, key, name, abbreviation, unit, result_type');

  if (parameterError) {
    return serverError('extract parameter catalog lookup failed', parameterError);
  }

  const parameters = (parameterRows ?? []) as LabParameterRow[];
  const parameterByKey = new Map(parameters.map((p) => [p.key, p]));

  let responseText: string | undefined;
  let usage = { input_tokens: 0, output_tokens: 0 };
  try {
    const gemini = getGeminiServerClient();
    const response = await gemini.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: base64 } },
            {
              text:
                `Katalog bekannter Laborparameter (key | Name | Werttyp | Einheit):\n${buildCatalogText(parameters)}\n\n` +
                'Lies das angehängte PDF und extrahiere alle Werte, die zu einem der obigen Parameter passen. ' +
                'Gib pro gefundenem Wert den exakten "key" aus dem Katalog zurück. ' +
                'Bei Werttyp "numeric" fülle value_numeric (Zahl, Punkt als Dezimaltrennzeichen), bei "qualitative" fülle value_qualitative mit dem Text aus dem Dokument (z. B. "negativ"). ' +
                'Das jeweils andere Feld bleibt null. ' +
                'Setze measured_at auf das Datum der Probenentnahme/Untersuchung im Format YYYY-MM-DD, falls im Dokument erkennbar, sonst null. ' +
                'Werte, die nicht im Katalog vorkommen, lässt du weg.',
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          'Du extrahierst Laborwerte aus medizinischen Befund-PDFs für eine Gesundheits-App. ' +
          'Nutze ausschließlich die "key"-Werte aus dem bereitgestellten Katalog. ' +
          'Erfinde keine Werte, die nicht im Dokument stehen, und rate nicht.',
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        responseSchema: buildSchema(parameters.map((p) => p.key)),
      },
    });

    responseText = response.text;
    usage = {
      input_tokens: response.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'MAX_TOKENS') {
      console.error('Gemini extraction hit MAX_TOKENS', { userId, outputTokens: usage.output_tokens });
      return NextResponse.json(
        {
          error:
            'Das PDF enthält zu viele Werte für eine einzelne automatische Auswertung. Bitte in kleineren Abschnitten hochladen oder die Werte manuell eintragen.',
        },
        { status: 502 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error('Gemini extraction request failed', { userId, message });
    return NextResponse.json({ error: 'Anfrage an Gemini fehlgeschlagen.' }, { status: 502 });
  }

  let rawResults: ExtractedResult[] = [];
  try {
    // Some models wrap JSON output in markdown code fences even with
    // responseMimeType/responseSchema set -- strip defensively before parsing.
    const cleaned = responseText?.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const parsed = cleaned ? (JSON.parse(cleaned) as { results?: ExtractedResult[] }) : null;
    rawResults = parsed?.results ?? [];
  } catch {
    console.error('Gemini extraction: failed to parse response as JSON', {
      userId,
      responseText: responseText?.slice(0, 500),
    });
    return NextResponse.json({ error: 'Antwort von Gemini konnte nicht gelesen werden.' }, { status: 502 });
  }

  const matches = rawResults
    .map((item) => {
      const parameter = parameterByKey.get(item.parameter_key);
      if (!parameter) {
        return null;
      }
      return {
        parameterId: parameter.id,
        parameterKey: parameter.key,
        parameterName: parameter.name,
        unit: parameter.unit,
        resultType: parameter.result_type,
        valueNumeric: item.value_numeric,
        valueQualitative: item.value_qualitative,
        measuredAt: item.measured_at,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  await supabase.from('pdf_extractions').insert({
    user_id: userId,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    matched_count: matches.length,
  });

  return NextResponse.json({ matches });
}
