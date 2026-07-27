import { NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { serverError } from '@/app/lib/apiError';

/** Removes the stored Whoop tokens; does not revoke them on Whoop's side (no revoke endpoint documented). */
export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const { error } = await supabase.from('wearable_connections').delete().eq('user_id', userId).eq('provider', 'whoop');

  if (error) {
    return serverError('whoop disconnect failed', error);
  }

  return NextResponse.json({ ok: true });
}
