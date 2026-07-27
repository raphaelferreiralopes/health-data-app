import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { getGeminiServerClient } from '@/app/lib/geminiServer';
import { serverError } from '@/app/lib/apiError';
import { isWithinRateLimit } from '@/app/lib/rateLimit';
import { MAX_UPLOAD_PDF_BYTES, parsePdfDataUrl } from '@/app/lib/pdfUpload';

// Same guardrail pattern as the other Gemini-backed upload routes -- the
// free tier is rate-limited, so a per-user daily cap protects the shared
// quota. One call now does both the explanation and the lab-value
// extraction, so a single limit/table covers both.
const DAILY_EXPLANATION_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
// Covers both the three explanation tiers and a full-panel lab-value array
// in one response -- higher than either individual call needed before.
const MAX_OUTPUT_TOKENS = 12_000;
const MODEL = 'gemini-3.1-flash-lite';
const MAX_TITLE_LENGTH = 200;

type ExplainPayload = {
  fileData?: string;
  fileName?: string;
  title?: string;
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

type GeminiResponse = {
  title: string;
  level1: string;
  level2: string;
  level3: string;
  results: ExtractedResult[];
};

export type ExtractionMatch = {
  parameterId: string;
  parameterKey: string;
  parameterName: string;
  unit: string | null;
  resultType: 'numeric' | 'qualitative';
  valueNumeric: number | null;
  valueQualitative: string | null;
  measuredAt: string | null;
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
      title: { type: Type.STRING },
      level1: { type: Type.STRING },
      level2: { type: Type.STRING },
      level3: { type: Type.STRING },
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
    required: ['title', 'level1', 'level2', 'level3', 'results'],
  } as const;
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as ExplainPayload;
  const parsedPdf = parsePdfDataUrl(body.fileData ?? '');

  if (!parsedPdf) {
    return NextResponse.json({ error: 'Es wird eine PDF-Datei erwartet.' }, { status: 400 });
  }
  if (parsedPdf.approxBytes > MAX_UPLOAD_PDF_BYTES) {
    return NextResponse.json(
      { error: `Datei zu groß (max. ${Math.floor(MAX_UPLOAD_PDF_BYTES / (1024 * 1024))} MB).` },
      { status: 400 },
    );
  }
  const { base64 } = parsedPdf;

  const withinLimit = await isWithinRateLimit(supabase, {
    table: 'arztbefund_uploads',
    userId,
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: DAILY_EXPLANATION_LIMIT,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Tageslimit erreicht (max. ${DAILY_EXPLANATION_LIMIT} Befund-Auswertungen pro Tag). Bitte versuche es morgen erneut.` },
      { status: 429 },
    );
  }

  const { data: parameterRows, error: parameterError } = await supabase
    .from('lab_parameters')
    .select('id, key, name, abbreviation, unit, result_type');

  if (parameterError) {
    return serverError('arztbefund-uploads parameter catalog lookup failed', parameterError);
  }

  const parameters = (parameterRows ?? []) as LabParameterRow[];
  const parameterByKey = new Map(parameters.map((p) => [p.key, p]));

  let responseText: string | undefined;
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
                'Lies den angehängten ärztlichen Befund und mache zwei Dinge:\n' +
                '1. Erkläre, was im Befund gefunden wurde, in drei Verständlichkeitsstufen:\n' +
                '   - level1 ("Einfach"): kurze, allgemeinverständliche Erklärung ohne Fachbegriffe, für medizinische Laien.\n' +
                '   - level2 ("Standard"): etwas ausführlicher, mit den wichtigsten Fachbegriffen kurz erklärt.\n' +
                '   - level3 ("Profi"): fachlich präzise Zusammenfassung mit medizinischer Terminologie, wie für eine Übergabe unter Fachpersonal.\n' +
                '   Gib außerdem einen kurzen, prägnanten "title" zurück (Art der Untersuchung und Datum, falls erkennbar).\n' +
                '2. Extrahiere zusätzlich in "results" alle enthaltenen Werte, die zu einem Parameter aus dem obigen Katalog passen. ' +
                'Gib pro gefundenem Wert den exakten "key" aus dem Katalog zurück. Bei Werttyp "numeric" fülle value_numeric (Zahl, Punkt als Dezimaltrennzeichen), ' +
                'bei "qualitative" fülle value_qualitative mit dem Text aus dem Dokument (z. B. "negativ"). Das jeweils andere Feld bleibt null. ' +
                'Setze measured_at auf das Datum der Probenentnahme/Untersuchung im Format YYYY-MM-DD, falls erkennbar, sonst null. ' +
                'Werte, die nicht im Katalog vorkommen, lässt du in "results" weg -- das schränkt nur die strukturierte Auswertung ein, nicht die Erklärung in level1-3.',
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          'Du liest ärztliche Befund-PDFs für eine Gesundheits-App und machst zwei Dinge gleichzeitig, beide ausschließlich auf Deutsch: ' +
          '(1) Du erklärst dem Nutzer verständlich, was im Dokument steht, in drei Stufen. Du stellst keine eigene Diagnose und gibst keine Behandlungsempfehlung. ' +
          'Weise in jeder Stufe knapp darauf hin, dass dies keine ärztliche Beratung ersetzt, wenn auffällige oder bedenkliche Werte im Befund stehen. ' +
          '(2) Du extrahierst strukturiert die Laborwerte, die zum bereitgestellten Katalog passen -- nutze ausschließlich dessen "key"-Werte. ' +
          'Erfinde in beiden Teilen keine Inhalte, die nicht im Dokument stehen, und rate nicht.',
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        responseSchema: buildSchema(parameters.map((p) => p.key)),
      },
    });

    responseText = response.text;

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'MAX_TOKENS') {
      console.error('Gemini Arztbefund processing hit MAX_TOKENS', { userId });
      return NextResponse.json(
        { error: 'Der Befund ist zu umfangreich für eine einzelne automatische Auswertung.' },
        { status: 502 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error('Gemini Arztbefund processing request failed', { userId, message });
    return NextResponse.json({ error: 'Anfrage an Gemini fehlgeschlagen.' }, { status: 502 });
  }

  let result: GeminiResponse | null = null;
  try {
    // Some models wrap JSON output in markdown code fences even with
    // responseMimeType/responseSchema set -- strip defensively before parsing.
    const cleaned = responseText?.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    result = cleaned ? (JSON.parse(cleaned) as GeminiResponse) : null;
  } catch {
    console.error('Gemini Arztbefund processing: failed to parse response as JSON', {
      userId,
      responseText: responseText?.slice(0, 500),
    });
    return NextResponse.json({ error: 'Antwort von Gemini konnte nicht gelesen werden.' }, { status: 502 });
  }

  if (!result || !result.level1 || !result.level2 || !result.level3) {
    return NextResponse.json({ error: 'Antwort von Gemini war unvollständig.' }, { status: 502 });
  }

  const matches: ExtractionMatch[] = (result.results ?? [])
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
    .filter((m): m is ExtractionMatch => m !== null);

  const userTitle = typeof body.title === 'string' ? body.title.trim() : '';
  const title = (userTitle || result.title || 'Arztbefund').slice(0, MAX_TITLE_LENGTH);
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim().slice(0, 255) : null;

  const { data, error } = await supabase
    .from('arztbefund_uploads')
    .insert({
      user_id: userId,
      title,
      file_name: fileName,
      file_data: body.fileData,
      explanation_level1: result.level1,
      explanation_level2: result.level2,
      explanation_level3: result.level3,
    })
    .select('id, title, file_name, file_data, explanation_level1, explanation_level2, explanation_level3, created_at')
    .single();

  if (error) {
    return serverError('arztbefund-uploads insert failed', error);
  }

  return NextResponse.json({
    entry: {
      id: data.id,
      title: data.title,
      fileName: data.file_name ?? undefined,
      fileData: data.file_data,
      explanationLevel1: data.explanation_level1,
      explanationLevel2: data.explanation_level2,
      explanationLevel3: data.explanation_level3,
      createdAt: data.created_at,
    },
    matches,
  });
}
