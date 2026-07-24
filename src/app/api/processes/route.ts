import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { isWithinRateLimit } from '@/app/lib/rateLimit';
import { serverError } from '@/app/lib/apiError';
import { PROCESS_TYPES, toProcessEntry, type ProcessRow, type ProcessType } from './shared';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_PROCESSES = 20;

/** All processes (active and completed) for the signed-in user, newest first. */
export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('processes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return serverError('processes list failed', error);
  }

  return NextResponse.json({ processes: (data as ProcessRow[]).map(toProcessEntry) });
}

/** Starts a new process of one of the fixed types; multiple, even of the same type, may run at once. */
export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const withinLimit = await isWithinRateLimit(supabase, {
    table: 'processes',
    userId,
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_PROCESSES,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Zu viele neue Prozesse. Bitte versuche es in einer Stunde erneut (max. ${RATE_LIMIT_MAX_PROCESSES} pro Stunde).` },
      { status: 429 },
    );
  }

  const body = (await request.json()) as { processType?: ProcessType };

  if (!body.processType || !PROCESS_TYPES.includes(body.processType)) {
    return NextResponse.json({ error: 'Ungültiger Prozesstyp' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('processes')
    .insert({ user_id: userId, process_type: body.processType })
    .select('*')
    .single();

  if (error) {
    return serverError('processes insert failed', error);
  }

  return NextResponse.json({ entry: toProcessEntry(data as ProcessRow) });
}
