'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';

type AnalysisEntry = {
  id: string;
  title: string;
  notes: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  createdAt: string;
};

const STORAGE_KEY = 'health-data-analysis-uploads';

function readStoredEntries(): AnalysisEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalysisEntry[]) : [];
  } catch {
    return [];
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}

export function AnalysisUploadCard() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; displayName: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const client = getBrowserSupabaseClient();
      let token: string | null = null;

      if (client) {
        const { data } = await client.auth.getSession();
        const user = data.session?.user;
        token = data.session?.access_token ?? null;
        if (user) {
          setCurrentUser({
            id: user.id,
            email: user.email ?? '',
            displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Nutzer',
          });
          setAccessToken(token);
        }
      }

      if (token) {
        try {
          const response = await fetch('/api/analysis-uploads', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) {
            throw new Error('API request failed');
          }

          const payload = (await response.json()) as { entries?: AnalysisEntry[] };
          if (payload.entries) {
            setEntries(payload.entries);
            setIsReady(true);
            return;
          }
        } catch {
          // fall back to local storage when the API is unavailable
        }
      }

      setEntries(readStoredEntries());
      setIsReady(true);
    };

    void init();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, isReady]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!title.trim() && !notes.trim() && !selectedFile) {
      setStatusMessage('Bitte gib mindestens einen Titel, einen Text oder eine Datei ein.');
      return;
    }

    const nextEntry: AnalysisEntry = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Analyse-Ergebnis',
      notes: notes.trim(),
      fileName: selectedFile?.name,
      fileType: selectedFile?.type,
      fileData: selectedFile ? await readFileAsDataUrl(selectedFile) : undefined,
      createdAt: new Date().toISOString(),
    };

    if (!accessToken) {
      setEntries((current) => [nextEntry, ...current]);
      setTitle('');
      setNotes('');
      setSelectedFile(null);
      setStatusMessage('Ergebnis lokal gespeichert. Melde dich an, um es dauerhaft zu sichern.');
      return;
    }

    try {
      const response = await fetch('/api/analysis-uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(nextEntry),
      });

      if (!response.ok) {
        throw new Error('Speichern fehlgeschlagen');
      }

      const payload = (await response.json()) as { entry?: AnalysisEntry };
      const savedEntry = payload.entry ?? nextEntry;
      setEntries((current) => [savedEntry, ...current]);
      setTitle('');
      setNotes('');
      setSelectedFile(null);
      setStatusMessage('Ergebnis gespeichert.');
    } catch {
      setEntries((current) => [nextEntry, ...current]);
      setStatusMessage('Ergebnis lokal gespeichert.');
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">Analyse-Ergebnisse</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Ergebnisse einfach sichern</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Speichere deine Befunde manuell, als PDF oder als Foto – direkt in dieser App für einen schnellen Überblick.
            </p>
          </div>
          <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
            {currentUser ? `Angemeldet als ${currentUser.displayName}` : 'Nicht angemeldet'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Titel
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="z. B. Laborwerte vom 20.07."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-0 transition focus:border-cyan-500 focus:bg-white"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Ergebnis oder Notiz
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Trage hier wichtige Werte, Befunde oder Hinweise ein..."
                rows={6}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:bg-white"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <label className="block text-sm font-medium text-slate-700">
              PDF oder Foto hochladen
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-700"
              />
            </label>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
              {selectedFile ? (
                <p>
                  Ausgewählt: <span className="font-semibold text-slate-900">{selectedFile.name}</span>
                </p>
              ) : (
                <p>Du kannst auch nur einen Text hinzufügen und später die Datei nachreichen.</p>
              )}
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Speichern
            </button>

            {statusMessage ? (
              <p className="mt-3 text-sm text-cyan-700">{statusMessage}</p>
            ) : null}
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Gespeicherte Ergebnisse</h2>
            <p className="mt-1 text-sm text-slate-600">Deine letzten Einträge bleiben hier sichtbar und sind dauerhaft verfügbar.</p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Noch keine Ergebnisse gespeichert. Füge oben deinen ersten Eintrag hinzu.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{entry.title}</h3>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {new Date(entry.createdAt).toLocaleDateString('de-DE')}
                  </span>
                </div>

                {entry.notes ? <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{entry.notes}</p> : null}

                {entry.fileData ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                    {entry.fileType?.startsWith('image/') ? (
                      <img src={entry.fileData} alt={entry.fileName ?? entry.title} className="max-h-80 rounded-xl object-contain" />
                    ) : (
                      <a
                        href={entry.fileData}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-cyan-700 underline"
                      >
                        {entry.fileName ?? 'Datei öffnen'}
                      </a>
                    )}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
