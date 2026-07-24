import { createSupabaseClient } from '@/core/supabaseClient';

/**
 * Server-only client using the service-role key, which bypasses RLS.
 * Callers must filter explicitly by the intended user id (the signed-in
 * user's id from supabaseServerAuth.ts) since RLS won't do it for them.
 * Never import this file from a Client Component or expose the service-role
 * key to the browser.
 */
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.local.example to .env.local and fill in your Supabase project credentials.',
    );
  }

  return createSupabaseClient(url, serviceRoleKey);
}
