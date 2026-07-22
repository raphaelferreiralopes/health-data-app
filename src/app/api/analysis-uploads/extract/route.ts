import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { getAnthropicServerClient } from '@/app/lib/anthropicServer';
import { MAX_UPLOAD_PDF_BYTES, parsePdfDataUrl } from '../shared';

// Cost guardrails for the Anthropic API call this route makes. Both are
// deliberately tight: worst case is roughly
// DAILY_EXTRACTION_LIMIT * (MAX_UPLOAD_PDF_BYTES worth of document tokens +
// the parameter-catalog prompt + MAX_OUTPUT_TOKENS), which on Haiku pricing
// stays in the low cents per user per day even at the ceiling.
const DAILY_EXTRACTION_LIMIT = 10;
const MAX_OUTPUT_TOKENS = 2048;
const MODEL = 'claude-haiku-4-5';

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
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            parameter_key: { type: 'string', enum: validKeys },
            value_numeric: { type: ['number', 'null'] },
            value_qualitative: { type: ['string', 'null'] },
            measured_at: { type: ['string', 'null'] },
          },
          required: ['parameter_key', 'value_numeric', 'value_qualitative', 'measured_at'],
          additionalProperties: false,
        },
      },
    },
    required: ['results'],
    additionalProperties: false,
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
    return NextResponse.json({ error: countError.message }, { status: 500 });
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
    return NextResponse.json({ error: parameterError.message }, { status: 500 });
  }

  const parameters = (parameterRows ?? []) as LabParameterRow[];
  const parameterByKey = new Map(parameters.map((p) => [p.key, p]));

  let response;
  try {
    const anthropic = getAnthropicServerClient();
    response = await anthropic.messages.parse({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system:
        'Du extrahierst Laborwerte aus medizinischen Befund-PDFs für eine Gesundheits-App. ' +
        'Nutze ausschließlich die "key"-Werte aus dem bereitgestellten Katalog. ' +
        'Erfinde keine Werte, die nicht im Dokument stehen, und rate nicht.',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
            {
              type: 'text',
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
      output_config: { format: { type: 'json_schema', schema: buildSchema(parameters.map((p) => p.key)) } },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Anfrage an Claude fehlgeschlagen.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const parsed = response.parsed_output as { results?: ExtractedResult[] } | null;
  const rawResults = parsed?.results ?? [];

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
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    matched_count: matches.length,
  });

  return NextResponse.json({ matches });
}
