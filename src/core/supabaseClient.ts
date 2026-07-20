import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Framework-agnostic factory: takes url/key as arguments instead of reading
 * env vars directly, so the same function works from Next.js (src/app/lib)
 * and later from a React Native/Expo app without any changes here.
 */
export function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
