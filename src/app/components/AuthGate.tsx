'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';

type AuthState = {
  email: string;
  id: string;
  displayName: string;
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

  useEffect(() => {
    if (!client) {
      return;
    }

    client.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user) {
        setSessionUser({
          id: user.id,
          email: user.email ?? '',
          displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nutzer',
        });
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
      } else {
        setSessionUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [client]);

  const handleLogout = async () => {
    if (!client) {
      return;
    }

    setIsLoading(true);
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

      await client.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Konto konnte nicht gelöscht werden.');
      setIsDeleting(false);
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

  if (isConfirmingDelete) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-xs text-right text-xs text-muted">
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
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div>
        <p className="text-sm font-semibold text-ink">Hallo, {sessionUser.displayName}</p>
        <p className="text-xs text-muted">{sessionUser.email}</p>
      </div>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-card"
      >
        Abmelden
      </button>
      <button
        type="button"
        onClick={() => setIsConfirmingDelete(true)}
        className="text-sm font-medium text-muted hover:text-red-600"
      >
        Konto löschen
      </button>
    </div>
  );
}
