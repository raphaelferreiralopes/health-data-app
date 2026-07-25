import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { isWithinRateLimit } from '@/app/lib/rateLimit';
import { serverError } from '@/app/lib/apiError';
import { isMedicationCategory, isMedicationFrequencyType } from '@/core/medicationSchedule';
import { parseMedicationPayload, toMedicationEntry, type MedicationRow } from './shared';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_MEDICATIONS = 50;

/** All medications/supplements (active and inactive) for the signed-in user, newest first. */
export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return serverError('medications list failed', error);
  }

  return NextResponse.json({ medications: (data as MedicationRow[]).map(toMedicationEntry) });
}

/** Creates a new medication/supplement with its intake frequency. */
export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const withinLimit = await isWithinRateLimit(supabase, {
    table: 'medications',
    userId,
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_MEDICATIONS,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Zu viele neue Einträge. Bitte versuche es in einer Stunde erneut (max. ${RATE_LIMIT_MAX_MEDICATIONS} pro Stunde).` },
      { status: 429 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const payload = parseMedicationPayload(body, { isMedicationCategory, isMedicationFrequencyType });

  if (!payload) {
    return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('medications')
    .insert({
      user_id: userId,
      name: payload.name,
      description: payload.description,
      category: payload.category,
      frequency_type: payload.frequencyType,
      weekdays: payload.weekdays,
      interval_days: payload.intervalDays,
      start_date: payload.startDate,
      active: payload.active,
    })
    .select('*')
    .single();

  if (error) {
    return serverError('medications insert failed', error);
  }

  return NextResponse.json({ entry: toMedicationEntry(data as MedicationRow) });
}
