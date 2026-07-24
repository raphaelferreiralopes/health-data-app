import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { isWithinRateLimit } from '@/app/lib/rateLimit';
import { serverError } from '@/app/lib/apiError';
import { toBodyCheckEntry, type BodyCheckPhase, type BodyCheckRow, type FamilyHistoryPayload } from './shared';

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_DRAFTS = 10;

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
    return serverError('body-checks draft lookup failed', draftError);
  }
  if (completedError) {
    return serverError('body-checks completed lookup failed', completedError);
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

  const withinLimit = await isWithinRateLimit(supabase, {
    table: 'body_checks',
    userId,
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_DRAFTS,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Zu viele neue Body-Checks. Bitte versuche es in einer Stunde erneut (max. ${RATE_LIMIT_MAX_DRAFTS} pro Stunde).` },
      { status: 429 },
    );
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
    return serverError('body-checks insert failed', error);
  }

  return NextResponse.json({ entry: toBodyCheckEntry(data as BodyCheckRow) });
}
