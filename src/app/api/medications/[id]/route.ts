import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { serverError } from '@/app/lib/apiError';
import { isMedicationCategory, isMedicationFrequencyType } from '@/core/medicationSchedule';
import { parseMedicationPayload, toMedicationEntry, type MedicationRow } from '../shared';

/** Updates a medication's fields (name, description, frequency, active state). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const payload = parseMedicationPayload(body, { isMedicationCategory, isMedicationFrequencyType });

  if (!payload) {
    return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('medications')
    .update({
      name: payload.name,
      description: payload.description,
      category: payload.category,
      frequency_type: payload.frequencyType,
      weekdays: payload.weekdays,
      interval_days: payload.intervalDays,
      start_date: payload.startDate,
      active: payload.active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return serverError('medications update failed', error);
  }

  return NextResponse.json({ entry: toMedicationEntry(data as MedicationRow) });
}

/** Permanently removes a medication and its intake logs (cascade). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { error } = await supabase.from('medications').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    return serverError('medications delete failed', error);
  }

  return NextResponse.json({ ok: true });
}
