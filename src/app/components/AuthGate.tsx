'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';

type AuthState = {
  email: string;
  id: string;
  displayName: string;
};

export function AuthGate() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [sessionUser, setSessionUser] = useState<AuthState | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const client = getBrowserSupabaseClient();
    if (!client) {
      setIsLoading(false);
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
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    const client = getBrowserSupabaseClient();
    if (!client) {
      setMessage('Supabase ist nicht konfiguriert.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: displayName || email.split('@')[0] },
          },
        });

        if (error) {
          throw error;
        }

        setMessage('Konto erstellt. Bitte bestätige die E-Mail, falls die Bestätigung aktiviert ist.');
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }

        setMessage('Erfolgreich angemeldet.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentifizierung fehlgeschlagen.';
      setMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const client = getBrowserSupabaseClient();
    if (!client) {
      return;
    }

    setIsLoading(true);
    await client.auth.signOut();
    setIsLoading(false);
    setMessage('Erfolgreich abgemeldet.');
  };

  if (isLoading && !sessionUser) {
    return <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 text-sm text-slate-500">Lade Auth…</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur">
      {sessionUser ? (
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Hallo, {sessionUser.displayName}</p>
            <p className="text-xs text-slate-500">{sessionUser.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Abmelden
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`rounded-full px-3 py-1 text-sm font-medium ${mode === 'login' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Anmelden
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`rounded-full px-3 py-1 text-sm font-medium ${mode === 'signup' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Registrieren
              </button>
            </div>

            {mode === 'signup' ? (
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Name"
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0"
              />
            ) : null}

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-Mail"
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Passwort"
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0"
            />
          </div>

          <button
            type="submit"
            className="rounded-full bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
          </button>
        </form>
      )}

      {message ? <p className="mt-2 text-sm text-cyan-700">{message}</p> : null}
    </div>
  );
}
