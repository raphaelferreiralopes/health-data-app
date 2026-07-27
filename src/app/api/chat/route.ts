import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { getGeminiServerClient } from '@/app/lib/geminiServer';
import { isWithinRateLimit } from '@/app/lib/rateLimit';
import { computeAge } from '@/core/age';
import { DEFAULT_PROFILE } from '@/core/demoUser';
import type { Gender } from '@/core/types';
import { buildChatContext } from '@/core/queries/getChatContext';

const MODEL = 'gemini-3.1-flash-lite';
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_MESSAGES = 30;
const MAX_OUTPUT_TOKENS = 2048;
const MAX_MESSAGE_CHARS = 4000;
// Client resends the full conversation each turn (no server-side chat log) --
// cap how much history is forwarded to Gemini to bound cost/latency.
const MAX_HISTORY_MESSAGES = 20;

type ChatMessage = { role: 'user' | 'model'; text: string };

function parseMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((m): m is Record<string, unknown> => typeof m === 'object' && m !== null)
    .map((m) => ({
      role: m.role === 'model' ? ('model' as const) : ('user' as const),
      text: typeof m.text === 'string' ? m.text.trim().slice(0, MAX_MESSAGE_CHARS) : '',
    }))
    .filter((m) => m.text.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const withinLimit = await isWithinRateLimit(supabase, {
    table: 'chat_interactions',
    userId,
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_MESSAGES,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Zu viele Nachrichten. Bitte versuche es in einer Stunde erneut (max. ${RATE_LIMIT_MAX_MESSAGES} pro Stunde).` },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { messages?: unknown };
  const messages = parseMessages(body.messages);

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  let gender: Gender = DEFAULT_PROFILE.gender;
  let age = DEFAULT_PROFILE.age;
  const { data: profile } = await supabase.from('profiles').select('gender, date_of_birth').eq('user_id', userId).maybeSingle();
  if (profile) {
    gender = profile.gender;
    age = computeAge(profile.date_of_birth);
  }

  let context: string;
  try {
    context = await buildChatContext({ supabase, userId, gender, age });
  } catch (error) {
    console.error('chat context build failed', { userId, error });
    return NextResponse.json({ error: 'Deine Daten konnten nicht geladen werden.' }, { status: 500 });
  }

  let responseText: string | undefined;
  let usage = { input_tokens: 0, output_tokens: 0 };
  try {
    const gemini = getGeminiServerClient();
    const response = await gemini.models.generateContent({
      model: MODEL,
      contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      config: {
        systemInstruction:
          'Du bist der Gesundheits-Assistent der App "longevitystack". Du hilfst dem Nutzer, seine eigenen ' +
          'Gesundheitsdaten (Laborwerte, Medikamente, Arztbefunde) zu verstehen und einzuordnen. ' +
          'Nutze ausschließlich die unten aufgeführten Daten des Nutzers -- erfinde keine Werte, die dort nicht stehen. ' +
          'Du stellst keine Diagnose und gibst keine Therapieempfehlung; bei auffälligen ("AUSSERHALB des Normbereichs") ' +
          'Werten weist du darauf hin, dass eine ärztliche Einschätzung sinnvoll ist. ' +
          'Antworte kurz, klar und auf Deutsch. Falls für eine Frage keine passenden Daten vorliegen, sag das offen.\n\n' +
          `Daten des Nutzers:\n${context}`,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    });

    responseText = response.text;
    usage = {
      input_tokens: response.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error('Gemini chat request failed', { userId, message });
    return NextResponse.json({ error: 'Anfrage an Gemini fehlgeschlagen.' }, { status: 502 });
  }

  await supabase.from('chat_interactions').insert({
    user_id: userId,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
  });

  if (!responseText) {
    return NextResponse.json({ error: 'Keine Antwort von Gemini erhalten.' }, { status: 502 });
  }

  return NextResponse.json({ reply: responseText });
}
