import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Session is stored in cookies (not localStorage) via @supabase/ssr, so
 * Server Components can read the same session -- see supabaseServerAuth.ts
 * and proxy.ts, which keeps the session cookie fresh on every request.
 */
export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  browserClient = createBrowserClient(url, anonKey);

  return browserClient;
}
