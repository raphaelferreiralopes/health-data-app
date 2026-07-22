import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { RECOMMENDED_TEST_KEY_ORDER, planRecommendedTests, toRecommendedTestEntry, type RecommendedTestRow } from './shared';

/**
 * Checklist of recommended follow-up tests for the user's most recently
 * completed Ganz-Körper-Check. The three rows are created lazily on first
 * read so older completed checks (from before this table existed) get one too.
 */
export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { data: bodyCheck, error: bodyCheckError } = await supabase
    .from('body_checks')
    .select('id, completed_at, biological_sex')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (bodyCheckError) {
    return NextResponse.json({ error: bodyCheckError.message }, { status: 500 });
  }
  if (!bodyCheck) {
    return NextResponse.json({ bodyCheckId: null, tests: [] });
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('recommended_tests')
    .select('*')
    .eq('body_check_id', bodyCheck.id);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  let rows = existingRows as RecommendedTestRow[];

  // Backfill by missing test_key rather than "table empty" so accounts that
  // already had phase-1 rows (seeded before phases 2/3 existed) still get the
  // newer ones added instead of being stuck with only the original three.
  const existingKeys = new Set(rows.map((row) => row.test_key));
  const plan = planRecommendedTests(bodyCheck.biological_sex as 'm' | 'f' | null);
  const missing = plan.filter(({ testKey }) => !existingKeys.has(testKey));

  if (missing.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('recommended_tests')
      .insert(
        missing.map(({ phase, testKey }) => ({
          user_id: userId,
          body_check_id: bodyCheck.id,
          test_key: testKey,
          phase,
        })),
      )
      .select('*');

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    rows = [...rows, ...(inserted as RecommendedTestRow[])];
  }

  const sorted = [...rows].sort(
    (a, b) => a.phase - b.phase || RECOMMENDED_TEST_KEY_ORDER.indexOf(a.test_key) - RECOMMENDED_TEST_KEY_ORDER.indexOf(b.test_key),
  );

  return NextResponse.json({
    bodyCheckId: bodyCheck.id,
    tests: sorted.map(toRecommendedTestEntry),
  });
}
