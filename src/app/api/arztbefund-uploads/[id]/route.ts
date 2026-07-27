import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { serverError } from '@/app/lib/apiError';

/** Permanently removes an uploaded Arztbefund and its AI explanation. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { error } = await supabase.from('arztbefund_uploads').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    return serverError('arztbefund-uploads delete failed', error);
  }

  return NextResponse.json({ ok: true });
}
