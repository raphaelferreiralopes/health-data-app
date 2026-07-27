import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export type RouteHandlerUser = { id: string };

/**
 * Reads the signed-in user from the session cookie for use in Route
 * Handlers reached via a full top-level browser navigation rather than
 * fetch() -- specifically the wearable OAuth connect/callback redirects,
 * which the browser follows directly and can't attach an Authorization
 * header to. Every other API route uses getAuthenticatedUserId (Bearer
 * token, see apiAuth.ts) instead; this is only for routes that must be
 * plain navigations because an external provider redirects the browser
 * straight to them.
 */
export async function getRouteHandlerUser(): Promise<RouteHandlerUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return { id: data.user.id };
}
