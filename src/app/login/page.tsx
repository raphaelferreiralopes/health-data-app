'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogoMark } from '@/app/components/Logo';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import { recordLoginMode } from '@/app/lib/rememberMe';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/home';

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [hasConsented, setHasConsented] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (mode === 'signup' && !hasConsented) {
      setMessage('Bitte bestätige den Hinweis zu Datenschutz und Gesundheitsdaten.');
      return;
    }

    const client = getBrowserSupabaseClient();
    if (!client) {
      setMessage('Supabase ist nicht konfiguriert.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: displayName || email.split('@')[0] },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          recordLoginMode(rememberMe ? 'remember' : 'ephemeral');
          router.push(nextPath);
          router.refresh();
          return;
        }

        setMode('login');
        setMessage('Konto erstellt. Bitte bestätige deine E-Mail und melde dich anschließend an.');
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }

        recordLoginMode(rememberMe ? 'remember' : 'ephemeral');
        router.push(nextPath);
        router.refresh();
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentifizierung fehlgeschlagen.';
      setMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2.5 text-center">
          <LogoMark className="h-8 w-8" />
          <span className="text-2xl font-light tracking-tight text-ink">longevitystack</span>
          <span className="text-sm text-muted">Kenn dich. Von innen.</span>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="mb-5 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-ink text-white' : 'bg-card text-muted hover:text-ink'
              }`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-ink text-white' : 'bg-card text-muted hover:text-ink'
              }`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mode === 'signup' ? (
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Name"
                className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
              />
            ) : null}

            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="E-Mail"
              className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Passwort"
              className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
            />

            {mode === 'signup' ? (
              <label className="flex items-start gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={hasConsented}
                  onChange={(event) => setHasConsented(event.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Ich habe die{' '}
                  <a href="/datenschutz" target="_blank" rel="noreferrer" className="font-medium text-brand hover:text-brand-deep">
                    Datenschutz- und Gesundheitshinweise
                  </a>{' '}
                  gelesen und bin einverstanden, dass meine Gesundheitsdaten hier zu Testzwecken gespeichert werden -- optional
                  auch automatisiert durch einen externen KI-Dienst (Google Gemini) ausgewertet, wenn ich diese Funktion aktiv
                  nutze.
                </span>
              </label>
            ) : null}

            <div>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-line"
                />
                Angemeldet bleiben
              </label>
              {!rememberMe ? (
                <p className="mt-1 text-xs text-muted">Du wirst abgemeldet, sobald du den Browser schließt und neu öffnest.</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              {mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </button>
          </form>

          {message ? <p className="mt-4 text-sm text-brand-deep">{message}</p> : null}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          <a href="/datenschutz" className="hover:text-ink">
            Datenschutz &amp; Hinweise
          </a>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
