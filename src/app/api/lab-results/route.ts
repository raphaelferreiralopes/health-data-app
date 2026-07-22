import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';

type LabResultInput = {
  parameterId: string;
  valueNumeric?: number | null;
  valueQualitative?: string | null;
  measuredAt: string;
};

type LabResultsPayload = {
  results?: LabResultInput[];
};

/** Writes user-confirmed lab results, e.g. from the PDF extraction review step. */
export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as LabResultsPayload;
  const results = body.results ?? [];

  if (results.length === 0) {
    return NextResponse.json({ error: 'Keine Werte zum Speichern übergeben.' }, { status: 400 });
  }

  const payload = results.map((r) => ({
    user_id: userId,
    parameter_id: r.parameterId,
    value: r.valueNumeric ?? null,
    value_qualitative: r.valueQualitative ?? null,
    measured_at: r.measuredAt,
  }));

  const { error } = await supabase.from('lab_results').insert(payload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: payload.length });
}
