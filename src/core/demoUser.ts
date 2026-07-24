import type { Gender } from './types';

/**
 * Placeholder demographic data, needed to pick gender/age-specific
 * reference ranges. Used as a default for signed-in users until they fill
 * in their own profile (see AuthGate / /api/profile) -- see
 * datenbank/diagnostik/[tab]/page.tsx.
 */
export const DEFAULT_PROFILE: { gender: Gender; age: number } = {
  gender: 'm',
  age: 34,
};
