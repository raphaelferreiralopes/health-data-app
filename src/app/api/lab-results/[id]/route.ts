import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { serverError } from '@/app/lib/apiError';
import { DATE_ONLY_RE } from '../shared';

type PatchPayload = Partial<{
  valueNumeric: number | null;
  valueQualitative: string | null;
  measuredAt: string;
}>;

/** Corrects a single previously-saved lab result (e.g. a typo in the value or date). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as PatchPayload;
  const update: Record<string, unknown> = {};

  if (body.valueNumeric !== undefined) {
    if (body.valueNumeric !== null && typeof body.valueNumeric !== 'number') {
      return NextResponse.json({ error: 'Ungültiger Wert' }, { status: 400 });
    }
    update.value = body.valueNumeric;
  }
  if (body.valueQualitative !== undefined) {
    if (body.valueQualitative !== null && typeof body.valueQualitative !== 'string') {
      return NextResponse.json({ error: 'Ungültiger Wert' }, { status: 400 });
    }
    update.value_qualitative = body.valueQualitative;
  }
  if (body.measuredAt !== undefined) {
    if (typeof body.measuredAt !== 'string' || !DATE_ONLY_RE.test(body.measuredAt)) {
      return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 });
    }
    update.measured_at = body.measuredAt;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Keine Änderung übergeben.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('lab_results')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, parameter_id, value, value_qualitative, measured_at')
    .single();

  if (error) {
    return serverError('lab-results update failed', error);
  }

  return NextResponse.json({
    entry: {
      id: data.id,
      parameterId: data.parameter_id,
      valueNumeric: data.value,
      valueQualitative: data.value_qualitative,
      measuredAt: data.measured_at,
    },
  });
}

/** Deletes a single lab result the signed-in user previously saved. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { error } = await supabase.from('lab_results').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    return serverError('lab-results delete failed', error);
  }

  return NextResponse.json({ deleted: true });
}
