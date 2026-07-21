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
    </div>
  );
}
