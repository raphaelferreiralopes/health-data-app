import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolves the user id from the request's bearer token instead of trusting
 * a client-supplied userId. Routes using the service-role Supabase client
 * bypass RLS, so without this any caller could read or write another
 * user's rows just by passing a different id.
 */
export async function getAuthenticatedUserId(request: Request, supabase: SupabaseClient): Promise<string | null> {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}
