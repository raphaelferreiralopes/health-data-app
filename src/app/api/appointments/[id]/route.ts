import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { serverError } from '@/app/lib/apiError';
import { parseAppointmentPayload, toAppointmentEntry, type AppointmentRow } from '../shared';

/** Updates an appointment's fields. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const payload = parseAppointmentPayload(body);

  if (!payload) {
    return NextResponse.json({ error: 'Titel und Datum sind erforderlich' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('appointments')
    .update({
      title: payload.title,
      doctor_name: payload.doctorName,
      location: payload.location,
      appointment_date: payload.date,
      appointment_time: payload.time,
      notes: payload.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return serverError('appointments update failed', error);
  }

  return NextResponse.json({ entry: toAppointmentEntry(data as AppointmentRow) });
}

/** Permanently removes an appointment. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { error } = await supabase.from('appointments').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    return serverError('appointments delete failed', error);
  }

  return NextResponse.json({ ok: true });
}
