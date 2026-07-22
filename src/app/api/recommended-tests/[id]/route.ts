import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { toRecommendedTestEntry, type RecommendedTestRow, type RecommendedTestStatus } from '../shared';

type PatchPayload = { status: RecommendedTestStatus };

/** Advances (or reverts) the checklist stage for a single recommended test. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const body = (await request.json()) as PatchPayload;

  const { data, error } = await supabase
    .from('recommended_tests')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: toRecommendedTestEntry(data as RecommendedTestRow) });
}
