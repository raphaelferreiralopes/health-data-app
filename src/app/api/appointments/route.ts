import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { isWithinRateLimit } from '@/app/lib/rateLimit';
import { serverError } from '@/app/lib/apiError';
import { parseAppointmentPayload, toAppointmentEntry, type AppointmentRow } from './shared';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_APPOINTMENTS = 50;

/** All appointments for the signed-in user, soonest first. */
export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true, nullsFirst: false });

  if (error) {
    return serverError('appointments list failed', error);
  }

  return NextResponse.json({ appointments: (data as AppointmentRow[]).map(toAppointmentEntry) });
}

/** Creates a new doctor's appointment. */
export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const withinLimit = await isWithinRateLimit(supabase, {
    table: 'appointments',
    userId,
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_APPOINTMENTS,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Zu viele neue Termine. Bitte versuche es in einer Stunde erneut (max. ${RATE_LIMIT_MAX_APPOINTMENTS} pro Stunde).` },
      { status: 429 },
    );
  }

  const body = (await request.json()) as Record<string, unknown>;
  const payload = parseAppointmentPayload(body);

  if (!payload) {
    return NextResponse.json({ error: 'Titel und Datum sind erforderlich' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: userId,
      title: payload.title,
      doctor_name: payload.doctorName,
      location: payload.location,
      appointment_date: payload.date,
      appointment_time: payload.time,
      notes: payload.notes,
    })
    .select('*')
    .single();

  if (error) {
    return serverError('appointments insert failed', error);
  }

  return NextResponse.json({ entry: toAppointmentEntry(data as AppointmentRow) });
}
