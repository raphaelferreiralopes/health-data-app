import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { toBodyCheckEntry, type BodyCheckPhase, type BodyCheckRow, type FamilyHistoryPayload } from './shared';

type BodyCheckPayload = Partial<{
  heightCm: number | null;
  weightKg: number | null;
  biologicalSex: 'm' | 'f' | null;
  wantsDocumentUpload: boolean | null;
  familyHistory: FamilyHistoryPayload;
  phase: BodyCheckPhase;
  questionIndex: number;
}>;

/** Draft (in_progress) and most recently completed body check for the signed-in user. */
export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const [{ data: draftRow, error: draftError }, { data: completedRow, error: completedError }] = await Promise.all([
    supabase
      .from('body_checks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('body_checks')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (draftError) {
    return NextResponse.json({ error: draftError.message }, { status: 500 });
  }
  if (completedError) {
    return NextResponse.json({ error: completedError.message }, { status: 500 });
  }

  return NextResponse.json({
    draft: draftRow ? toBodyCheckEntry(draftRow as BodyCheckRow) : null,
    lastCompleted: completedRow ? toBodyCheckEntry(completedRow as BodyCheckRow) : null,
  });
}

/** Creates a new in-progress draft, called once the wizard advances past the intro step. */
export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as BodyCheckPayload;

  const payload = {
    user_id: userId,
    height_cm: body.heightCm ?? null,
    weight_kg: body.weightKg ?? null,
    biological_sex: body.biologicalSex ?? null,
    wants_document_upload: body.wantsDocumentUpload ?? null,
    family_history: body.familyHistory ?? { answers: {}, sectionNotes: {} },
    status: 'in_progress' as const,
    phase: body.phase ?? 'measurements',
    question_index: body.questionIndex ?? 0,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('body_checks').insert(payload).select('*').single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: toBodyCheckEntry(data as BodyCheckRow) });
}
