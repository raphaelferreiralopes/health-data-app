const LOGIN_MODE_KEY = 'lsapp-login-mode';
const TAB_ALIVE_KEY = 'lsapp-tab-alive';

export type LoginMode = 'remember' | 'ephemeral';

/**
 * Supabase's cookie-based session (via @supabase/ssr) always persists up to
 * 400 days regardless of any app-supplied cookie options -- the library
 * hardcodes that maxAge on every write (login and every silent token
 * refresh), so a real "log out when the browser closes" cookie isn't
 * reachable through its public API. Instead we track the user's choice in
 * localStorage (survives restarts) plus a sessionStorage heartbeat (cleared
 * when the browser fully closes, kept alive across reloads/navigation in the
 * same run) so AuthGate can detect "this is a restart after an ephemeral
 * login" and force a sign-out even though the cookie itself is still valid.
 */
export function recordLoginMode(mode: LoginMode): void {
  window.localStorage.setItem(LOGIN_MODE_KEY, mode);
  window.sessionStorage.setItem(TAB_ALIVE_KEY, '1');
}

export function clearLoginMode(): void {
  window.localStorage.removeItem(LOGIN_MODE_KEY);
  window.sessionStorage.removeItem(TAB_ALIVE_KEY);
}

/** True if this session was marked "nicht angemeldet bleiben" in a browser run that has since ended. */
export function isStaleEphemeralSession(): boolean {
  const mode = window.localStorage.getItem(LOGIN_MODE_KEY);
  if (mode !== 'ephemeral') return false;
  return !window.sessionStorage.getItem(TAB_ALIVE_KEY);
}

export function markTabAlive(): void {
  window.sessionStorage.setItem(TAB_ALIVE_KEY, '1');
}
