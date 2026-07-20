import type { Gender } from './types';

/**
 * MVP has no auth/login UI yet. All reads are scoped to this fixed demo
 * user id (matches supabase/seed.sql). Once real auth is wired up, replace
 * these with the authenticated user's id and a real profile table lookup —
 * RLS policies already key off auth.uid() so no query code needs to change.
 */
export const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

/** Placeholder demographic data, needed to pick gender/age-specific reference ranges. */
export const DEMO_USER_PROFILE: { gender: Gender; age: number } = {
  gender: 'm',
  age: 34,
};
