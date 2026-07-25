import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { serverError } from '@/app/lib/apiError';

/** Permanently removes an uploaded document/result entry. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { error } = await supabase.from('analysis_uploads').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    return serverError('analysis-uploads delete failed', error);
  }

  return NextResponse.json({ ok: true });
}
