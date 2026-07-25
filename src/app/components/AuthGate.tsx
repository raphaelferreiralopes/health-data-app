'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import { clearLoginMode, isStaleEphemeralSession, markTabAlive } from '@/app/lib/rememberMe';

type AuthState = {
  email: string;
  id: string;
  displayName: string;
};

type Profile = {
  gender: 'm' | 'f';
  dateOfBirth: string;
};

/**
 * Renders inside (app)/layout.tsx, which proxy.ts only lets signed-in users
 * reach -- so this only needs to show who's logged in and a logout action,
 * not a login form (that lives on /login).
 */
export function AuthGate() {
  const router = useRouter();
  const [client] = useState(() => getBrowserSupabaseClient());
  const [sessionUser, setSessionUser] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(client));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 'loading' until the first fetch resolves, then either the saved profile
  // or null (not created yet -- see /api/profile). Reference ranges for
  // signed-in users depend on this (see datenbank/diagnostik/[tab]/page.tsx),
  // so anyone without one is prompted to fill it in right here.
  const [profile, setProfile] = useState<Profile | 'loading' | null>('loading');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [hasDismissedProfilePrompt, setHasDismissedProfilePrompt] = useState(false);
  const [profileGender, setProfileGender] = useState<'m' | 'f'>('m');
  const [profileDateOfBirth, setProfileDateOfBirth] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const fetchProfile = async (accessToken: string) => {
    setProfile('loading');
    try {
      const response = await fetch('/api/profile', { headers: { Authorization: `Bearer ${accessToken}` } });
      const payload = (await response.json()) as { profile?: Profile | null };
      setProfile(payload.profile ?? null);
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    if (!client) {
      return;
    }

    client.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) {
        // Supabase's session cookie always persists ~400 days regardless of
        // "Angemeldet bleiben" (see rememberMe.ts), so a session marked
        // ephemeral that survived a full browser restart is forcibly ended
        // here instead of relying on the cookie itself to expire.
        if (isStaleEphemeralSession()) {
          clearLoginMode();
          client.auth.signOut().then(() => {
            router.push('/login');
            router.refresh();
          });
          return;
        }
        markTabAlive();
        setSessionUser({
          id: user.id,
          email: user.email ?? '',
          displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nutzer',
        });
        const accessToken = data.session?.access_token;
        if (accessToken) fetchProfile(accessToken);
      }
      setIsLoading(false);
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user) {
        setSessionUser({
          id: user.id,
          email: user.email ?? '',
          displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nutzer',
        });
        if (session?.access_token) fetchProfile(session.access_token);
      } else {
        setSessionUser(null);
        setProfile('loading');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [client, router]);

  const handleLogout = async () => {
    if (!client) {
      return;
    }

    setIsLoading(true);
    clearLoginMode();
    await client.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleDeleteAccount = async () => {
    if (!client) {
      return;
    }

    setDeleteError('');
    setIsDeleting(true);

    try {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error('Nicht angemeldet.');
      }

      const response = await fetch('/api/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Konto konnte nicht gelöscht werden.');
      }

      clearLoginMode();
      await client.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Konto konnte nicht gelöscht werden.');
      setIsDeleting(false);
    }
  };

  const openProfileEditor = () => {
    if (profile && profile !== 'loading') {
      setProfileGender(profile.gender);
      setProfileDateOfBirth(profile.dateOfBirth);
    }
    setProfileError('');
    setIsConfirmingDelete(false);
    setDeleteError('');
    setIsEditingProfile(true);
  };

  const closeProfileModal = () => {
    setIsEditingProfile(false);
    setHasDismissedProfilePrompt(true);
    setIsConfirmingDelete(false);
    setDeleteError('');
  };

  const handleSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!client) return;

    setProfileError('');
    setIsSavingProfile(true);

    try {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Nicht angemeldet.');

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gender: profileGender, dateOfBirth: profileDateOfBirth }),
      });
      const payload = (await response.json()) as { profile?: Profile; error?: string };
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? 'Profil konnte nicht gespeichert werden.');
      }

      setProfile(payload.profile);
      setIsEditingProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Profil konnte nicht gespeichert werden.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted">Lade…</div>;
  }

  if (!sessionUser) {
    return (
      <a href="/login" className="text-sm font-medium text-brand hover:text-brand-deep">
        Anmelden
      </a>
    );
  }

  // Auto-popup right after signup/login as long as no profile exists yet --
  // dismissible ("Später"), so it isn't a hard onboarding gate, but it comes
  // back on the next login until filled in. Also reachable manually via the
  // "Profil bearbeiten" button for edits later.
  const showProfileModal = isEditingProfile || (profile === null && !hasDismissedProfilePrompt);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Hallo, {sessionUser.displayName}</p>
          <p className="text-xs text-muted">{sessionUser.email}</p>
        </div>
        {profile !== null && profile !== 'loading' ? (
          <button type="button" onClick={openProfileEditor} className="text-sm font-medium text-muted hover:text-ink">
            Profil bearbeiten
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-card"
        >
          Abmelden
        </button>
      </div>

      {showProfileModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={closeProfileModal}
        >
          <form
            onSubmit={handleSaveProfile}
            onClick={(event) => event.stopPropagation()}
            className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-line bg-surface p-6 shadow-lg"
          >
            <div>
              <h2 className="text-base font-semibold text-ink">Geschlecht &amp; Geburtsdatum</h2>
              <p className="mt-1.5 text-sm text-muted">
                Referenzbereiche für Laborwerte hängen von Geschlecht und Alter ab (z. B. Blutbild, Hormone,
                Nierenwerte). Mit diesen Angaben zeigen wir dir die für dich passenden Normwerte statt eines
                allgemeinen Platzhalters.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileGender('m')}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  profileGender === 'm' ? 'bg-ink text-white' : 'bg-card text-muted hover:text-ink'
                }`}
              >
                Mann
              </button>
              <button
                type="button"
                onClick={() => setProfileGender('f')}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  profileGender === 'f' ? 'bg-ink text-white' : 'bg-card text-muted hover:text-ink'
                }`}
              >
                Frau
              </button>
              <input
                type="date"
                required
                value={profileDateOfBirth}
                onChange={(event) => setProfileDateOfBirth(event.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="rounded-xl border border-line bg-card px-3 py-1.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeProfileModal}
                disabled={isSavingProfile}
                className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-card disabled:opacity-60"
              >
                {profile === null ? 'Später' : 'Abbrechen'}
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
              >
                {isSavingProfile ? 'Speichere…' : 'Speichern'}
              </button>
            </div>
            {profileError ? <p className="text-xs text-red-600">{profileError}</p> : null}

            {profile !== null && profile !== 'loading' ? (
              <div className="mt-2 border-t border-line pt-4">
                {isConfirmingDelete ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted">
                      Konto und alle Daten unwiderruflich löschen? Das kann nicht rückgängig gemacht werden.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        disabled={isDeleting}
                        className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-card disabled:opacity-60"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {isDeleting ? 'Lösche…' : 'Ja, endgültig löschen'}
                      </button>
                    </div>
                    {deleteError ? <p className="text-xs text-red-600">{deleteError}</p> : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="text-xs font-medium text-muted hover:text-red-600"
                  >
                    Konto löschen
                  </button>
                )}
              </div>
            ) : null}
          </form>
        </div>
      ) : null}
    </>
  );
}
