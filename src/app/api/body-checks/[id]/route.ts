import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { toBodyCheckEntry, type BodyCheckPhase, type BodyCheckRow, type FamilyHistoryPayload } from '../shared';

type PatchPayload = Partial<{
  heightCm: number | null;
  weightKg: number | null;
  biologicalSex: 'm' | 'f' | null;
  wantsDocumentUpload: boolean | null;
  familyHistory: FamilyHistoryPayload;
  phase: BodyCheckPhase;
  questionIndex: number;
  completed: boolean;
}>;

/** Autosaves wizard progress into an existing draft, called after every step. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as PatchPayload;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.heightCm !== undefined) update.height_cm = body.heightCm;
  if (body.weightKg !== undefined) update.weight_kg = body.weightKg;
  if (body.biologicalSex !== undefined) update.biological_sex = body.biologicalSex;
  if (body.wantsDocumentUpload !== undefined) update.wants_document_upload = body.wantsDocumentUpload;
  if (body.familyHistory !== undefined) update.family_history = body.familyHistory;
  if (body.phase !== undefined) update.phase = body.phase;
  if (body.questionIndex !== undefined) update.question_index = body.questionIndex;
  if (body.completed) {
    update.status = 'completed';
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('body_checks')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: toBodyCheckEntry(data as BodyCheckRow) });
}
