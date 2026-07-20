import { createSupabaseClient } from '@/core/supabaseClient';

/**
 * Server-only client using the service-role key, which bypasses RLS.
 * That's intentional for the MVP: there is no login UI yet, so requests
 * aren't authenticated as a real Supabase user, and RLS policies on
 * lab_results key off auth.uid(). All queries here filter explicitly by
 * DEMO_USER_ID instead (see src/core/demoUser.ts). Never import this file
 * from a Client Component or expose the service-role key to the browser.
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
