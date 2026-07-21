import type { Gender } from './types';

/**
 * Fallback user id (matches supabase/seed.sql) used when nobody is signed
 * in, so the Datenbank tabs still show demo data. Signed-in users get their
 * own id from the session instead — see supabaseServerAuth.ts.
 */
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Placeholder demographic data, needed to pick gender/age-specific
 * reference ranges. There's no profile table yet, so even signed-in users
 * get these values for now — only which user's lab_results are shown
 * changes with login, not the reference ranges applied to them.
 */
export const DEMO_USER_PROFILE: { gender: Gender; age: number } = {
  gender: 'm',
  age: 34,
};
