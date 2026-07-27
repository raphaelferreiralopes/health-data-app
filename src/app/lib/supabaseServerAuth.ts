import { headers } from 'next/headers';
import { USER_EMAIL_HEADER, USER_ID_HEADER } from '@/app/lib/authHeaders';

export type ServerSessionUser = {
  id: string;
  email: string;
  displayName: string;
};

/**
 * Reads the signed-in user for use in Server Components. proxy.ts already
 * verified the session with Supabase (a real network round-trip to the auth
 * server) and forwards the result via request headers -- reading those here
 * instead of calling supabase.auth.getUser() again avoids repeating that
 * round-trip on every layout/page in the request tree. Only id/email are
 * carried over the header, so displayName falls back to the email's local
 * part rather than the user's custom full_name (unused by today's callers;
 * see AuthGate.tsx for the client-side version that has the full profile).
 */
export async function getServerSessionUser(): Promise<ServerSessionUser | null> {
  const headerList = await headers();
  const id = headerList.get(USER_ID_HEADER);
  const email = headerList.get(USER_EMAIL_HEADER) ?? '';

  if (!id) {
    return null;
  }

  return {
    id,
    email,
    displayName: email.split('@')[0] || 'Nutzer',
  };
}
