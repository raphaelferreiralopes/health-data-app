import { NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { getGeminiServerClient } from '@/app/lib/geminiServer';
import { isWithinRateLimit } from '@/app/lib/rateLimit';
import { MAX_UPLOAD_IMAGE_BYTES, parseImageDataUrl } from '@/app/lib/imageUpload';

// Same guardrail pattern as the other Gemini-backed upload routes -- the free tier is
// rate-limited, so a per-user daily cap protects the shared quota.
const DAILY_EXTRACTION_LIMIT = 10;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_OUTPUT_TOKENS = 4096;
const MODEL = 'gemini-3.1-flash-lite';

const FREQUENCY_TYPES = ['taeglich', 'nach_bedarf'] as const;
const CATEGORIES = ['medikament', 'supplement'] as const;

type ExtractPayload = {
  fileData?: string;
  fileName?: string;
};

type ExtractedMedication = {
  name: string;
  dosage: string | null;
  instructions: string | null;
  times_per_day: number | null;
  frequency_type: (typeof FREQUENCY_TYPES)[number] | null;
  category: (typeof CATEGORIES)[number] | null;
};

export type PrescriptionMatch = {
  name: string;
  description: string;
  category: (typeof CATEGORIES)[number];
  frequencyType: (typeof FREQUENCY_TYPES)[number];
  timesPerDay: number;
};

function buildSchema() {
  return {
    type: Type.OBJECT,
    properties: {
      medications: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            dosage: { type: Type.STRING, nullable: true },
            instructions: { type: Type.STRING, nullable: true },
            times_per_day: { type: Type.NUMBER, nullable: true },
            frequency_type: { type: Type.STRING, enum: [...FREQUENCY_TYPES], nullable: true },
            category: { type: Type.STRING, enum: [...CATEGORIES], nullable: true },
          },
          required: ['name', 'dosage', 'instructions', 'times_per_day', 'frequency_type', 'category'],
        },
      },
    },
    required: ['medications'],
  } as const;
}

function toMatch(item: ExtractedMedication): PrescriptionMatch | null {
  const name = item.name?.trim().slice(0, 200);
  if (!name) {
    return null;
  }

  const description = [item.dosage, item.instructions].filter((part) => part && part.trim()).join(', ').slice(0, 2000);
  const timesPerDay =
    typeof item.times_per_day === 'number' && Number.isInteger(item.times_per_day) && item.times_per_day >= 1 && item.times_per_day <= 6
      ? item.times_per_day
      : 1;
  const frequencyType = FREQUENCY_TYPES.includes(item.frequency_type as (typeof FREQUENCY_TYPES)[number]) ? item.frequency_type! : 'taeglich';
  const category = CATEGORIES.includes(item.category as (typeof CATEGORIES)[number]) ? item.category! : 'medikament';

  return { name, description, category, frequencyType, timesPerDay };
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as ExtractPayload;
  const parsedImage = parseImageDataUrl(body.fileData ?? '');

  if (!parsedImage) {
    return NextResponse.json({ error: 'Es wird ein Foto (JPEG, PNG, WEBP oder HEIC) erwartet.' }, { status: 400 });
  }
  if (parsedImage.approxBytes > MAX_UPLOAD_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Datei zu groß (max. ${Math.floor(MAX_UPLOAD_IMAGE_BYTES / (1024 * 1024))} MB).` },
      { status: 400 },
    );
  }
  const { mimeType, base64 } = parsedImage;

  const withinLimit = await isWithinRateLimit(supabase, {
    table: 'prescription_extractions',
    userId,
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: DAILY_EXTRACTION_LIMIT,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Tageslimit erreicht (max. ${DAILY_EXTRACTION_LIMIT} Rezept-Auslesungen pro Tag). Bitte versuche es morgen erneut.` },
      { status: 429 },
    );
  }

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
            { inlineData: { mimeType, data: base64 } },
            {
              text:
                'Lies das angehängte Foto eines ärztlichen Rezepts und liste alle darauf verordneten Medikamente auf. ' +
                'Gib pro Medikament "name" (Präparatename), "dosage" (Stärke/Dosierung, z. B. "20mg", falls erkennbar, sonst null), ' +
                '"instructions" (Einnahmehinweis wie auf dem Rezept, z. B. "1-0-1-0" oder "morgens und abends", falls erkennbar, sonst null), ' +
                '"times_per_day" (Anzahl Einnahmen pro Tag als Zahl, aus den Instructions abgeleitet, sonst 1), ' +
                '"frequency_type" ("nach_bedarf" falls das Rezept "bei Bedarf" o.ä. angibt, sonst "taeglich"), ' +
                'und "category" (immer "medikament", außer es handelt sich erkennbar um ein Nahrungsergänzungsmittel) zurück.',
            },
          ],
        },
      ],
      config: {
        systemInstruction:
          'Du liest Fotos von ärztlichen Rezepten für eine Gesundheits-App aus und extrahierst die verordneten Medikamente strukturiert auf Deutsch. ' +
          'Erfinde keine Medikamente, die nicht auf dem Rezept stehen, und rate nicht bei unleserlichen Stellen -- lasse das Feld dann leer/null.',
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        responseSchema: buildSchema(),
      },
    });

    responseText = response.text;
    usage = {
      input_tokens: response.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'MAX_TOKENS') {
      console.error('Gemini prescription extraction hit MAX_TOKENS', { userId });
      return NextResponse.json(
        { error: 'Das Rezept enthält zu viele Einträge für eine einzelne automatische Auswertung.' },
        { status: 502 },
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error('Gemini prescription extraction request failed', { userId, message });
    return NextResponse.json({ error: 'Anfrage an Gemini fehlgeschlagen.' }, { status: 502 });
  }

  let rawMedications: ExtractedMedication[] = [];
  try {
    // Some models wrap JSON output in markdown code fences even with
    // responseMimeType/responseSchema set -- strip defensively before parsing.
    const cleaned = responseText?.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    const parsed = cleaned ? (JSON.parse(cleaned) as { medications?: ExtractedMedication[] }) : null;
    rawMedications = parsed?.medications ?? [];
  } catch {
    console.error('Gemini prescription extraction: failed to parse response as JSON', {
      userId,
      responseText: responseText?.slice(0, 500),
    });
    return NextResponse.json({ error: 'Antwort von Gemini konnte nicht gelesen werden.' }, { status: 502 });
  }

  const matches = rawMedications.map(toMatch).filter((m): m is PrescriptionMatch => m !== null);

  await supabase.from('prescription_extractions').insert({
    user_id: userId,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    matched_count: matches.length,
  });

  return NextResponse.json({ matches });
}
