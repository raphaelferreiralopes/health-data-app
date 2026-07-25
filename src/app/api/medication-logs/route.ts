import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { isWithinRateLimit } from '@/app/lib/rateLimit';
import { serverError } from '@/app/lib/apiError';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_LOGS = 500;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type LogRow = { medication_id: string };

/** Medication ids already checked off for a given day (?date=YYYY-MM-DD). */
export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const date = new URL(request.url).searchParams.get('date') ?? '';
  if (!DATE_PATTERN.test(date)) {
    return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('medication_intake_logs')
    .select('medication_id')
    .eq('user_id', userId)
    .eq('log_date', date);

  if (error) {
    return serverError('medication-logs list failed', error);
  }

  return NextResponse.json({ medicationIds: (data as LogRow[]).map((row) => row.medication_id) });
}

/** Checks off a medication as taken for a given day; idempotent (upsert on the medication_id+log_date unique key). */
export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const withinLimit = await isWithinRateLimit(supabase, {
    table: 'medication_intake_logs',
    userId,
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_LOGS,
  });
  if (!withinLimit) {
    return NextResponse.json({ error: 'Zu viele Änderungen. Bitte versuche es später erneut.' }, { status: 429 });
  }

  const body = (await request.json()) as { medicationId?: string; date?: string };
  const medicationId = typeof body.medicationId === 'string' ? body.medicationId : '';
  const date = typeof body.date === 'string' ? body.date : '';

  if (!medicationId || !DATE_PATTERN.test(date)) {
    return NextResponse.json({ error: 'medicationId und Datum sind erforderlich' }, { status: 400 });
  }

  const { error } = await supabase
    .from('medication_intake_logs')
    .upsert({ user_id: userId, medication_id: medicationId, log_date: date }, { onConflict: 'medication_id,log_date' });

  if (error) {
    return serverError('medication-logs insert failed', error);
  }

  return NextResponse.json({ ok: true });
}

/** Unchecks a medication for a given day (?medicationId=&date=YYYY-MM-DD). */
export async function DELETE(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const url = new URL(request.url);
  const medicationId = url.searchParams.get('medicationId') ?? '';
  const date = url.searchParams.get('date') ?? '';

  if (!medicationId || !DATE_PATTERN.test(date)) {
    return NextResponse.json({ error: 'medicationId und Datum sind erforderlich' }, { status: 400 });
  }

  const { error } = await supabase
    .from('medication_intake_logs')
    .delete()
    .eq('user_id', userId)
    .eq('medication_id', medicationId)
    .eq('log_date', date);

  if (error) {
    return serverError('medication-logs delete failed', error);
  }

  return NextResponse.json({ ok: true });
}
