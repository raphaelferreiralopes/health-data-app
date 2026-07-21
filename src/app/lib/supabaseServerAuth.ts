import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export type ServerSessionUser = {
  id: string;
  email: string;
  displayName: string;
};

/**
 * Reads the signed-in user from the session cookie for use in Server
 * Components. Uses the anon key (not the service-role client from
 * supabaseServer.ts) since this only needs to verify who's asking, not
 * bypass RLS. Cookies can't be written during Server Component rendering
 * (see proxy.ts, which refreshes the session cookie on every request), so
 * setAll is a no-op here.
 */
export async function getServerSessionUser(): Promise<ServerSessionUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  const user = data.user;
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nutzer',
  };
}
