import type { SupabaseClient } from '@supabase/supabase-js';

type RateLimitOptions = {
  table: string;
  userId: string;
  windowMs: number;
  limit: number;
};

/**
 * Counts the caller's own rows created in the last `windowMs` and reports
 * whether they're still under `limit`. Same pattern as the existing
 * pdf_extractions-style daily caps used by the Gemini upload routes, generalized
 * for reuse. Fails open on DB errors -- an unrelated infra hiccup shouldn't
 * block writes.
 */
export async function isWithinRateLimit(supabase: SupabaseClient, { table, userId, windowMs, limit }: RateLimitOptions): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);

  if (error) {
    console.error(`rate limit check failed (${table})`, error.message);
    return true;
  }

  return (count ?? 0) < limit;
}
