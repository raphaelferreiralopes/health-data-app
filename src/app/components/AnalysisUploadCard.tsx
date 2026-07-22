'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import { ConfirmedLabResult, ExtractionMatch, ExtractionReviewSheet } from './ExtractionReviewSheet';

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

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AnalysisUploadCard() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [extractionMatches, setExtractionMatches] = useState<ExtractionMatch[] | null>(null);

  useEffect(() => {
    const init = async () => {
      const client = getBrowserSupabaseClient();
      let token: string | null = null;

      if (client) {
        const { data } = await client.auth.getSession();
        token = data.session?.access_token ?? null;
        setAccessToken(token);
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

    if (file && file.type !== 'application/pdf') {
      setStatusMessage('Bitte nur PDF-Dateien hochladen.');
      event.target.value = '';
      setSelectedFile(null);
      return;
    }

    setStatusMessage('');
    setSelectedFile(file);
  };

  const handleExtract = async () => {
    if (!selectedFile || !accessToken) {
      return;
    }

    setExtractionError('');
    setIsExtracting(true);

    try {
      const fileData = await readFileAsDataUrl(selectedFile);
      const response = await fetch('/api/analysis-uploads/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileData, fileName: selectedFile.name }),
      });

      const payload = (await response.json()) as { matches?: ExtractionMatch[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Auslesen fehlgeschlagen.');
      }

      setExtractionMatches(payload.matches ?? []);
    } catch (err) {
      setExtractionError(err instanceof Error ? err.message : 'Auslesen fehlgeschlagen.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleConfirmExtraction = async (rows: ConfirmedLabResult[]) => {
    if (!accessToken) {
      throw new Error('Nicht angemeldet.');
    }

    const response = await fetch('/api/lab-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ results: rows }),
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? 'Speichern fehlgeschlagen.');
    }

    setExtractionMatches(null);
    setStatusMessage(`${rows.length} Laborwerte übernommen.`);
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
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-deep">Analyse-Ergebnisse</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Ergebnisse einfach sichern</h1>
        <p className="mt-2 text-sm text-muted">Speichere deine Befunde manuell oder als PDF.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="block text-sm font-medium text-ink">
          Titel
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="z. B. Laborwerte vom 20.07."
            className="mt-2 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Ergebnis oder Notiz
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Trage hier wichtige Werte, Befunde oder Hinweise ein..."
            rows={5}
            className="mt-2 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          PDF
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand-pale file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-deep hover:file:bg-brand/20"
          />
        </label>
        {selectedFile ? <p className="text-xs text-muted">Ausgewählt: {selectedFile.name}</p> : null}

        {selectedFile ? (
          <div>
            <button
              type="button"
              onClick={handleExtract}
              disabled={isExtracting || !accessToken}
              className="self-start rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand-deep disabled:opacity-60"
            >
              {isExtracting ? 'Werte werden ausgelesen…' : 'Werte automatisch auslesen'}
            </button>
            {!accessToken ? (
              <p className="mt-2 text-xs text-muted">Melde dich an, um Werte automatisch auslesen zu lassen.</p>
            ) : null}
            {extractionError ? <p className="mt-2 text-sm text-red-600">{extractionError}</p> : null}
          </div>
        ) : null}

        <button
          type="submit"
          className="mt-2 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
        >
          Speichern
        </button>

        {statusMessage ? <p className="text-sm text-brand-deep">{statusMessage}</p> : null}
      </form>

      <div>
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Gespeicherte Ergebnisse</h2>

        {entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Noch keine Ergebnisse gespeichert.</p>
        ) : (
          <div className="mt-4 divide-y divide-line border-t border-line">
            {entries.map((entry) => (
              <article key={entry.id} className="flex flex-col gap-1 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-medium text-ink">{entry.title}</h3>
                  <span className="text-xs text-muted">{formatDate(entry.createdAt)}</span>
                </div>

                {entry.notes ? <p className="whitespace-pre-wrap text-sm text-muted">{entry.notes}</p> : null}

                {entry.fileData ? (
                  <a
                    href={entry.fileData}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-brand hover:text-brand-deep"
                  >
                    {entry.fileName ?? 'PDF öffnen'}
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>

      {extractionMatches ? (
        <ExtractionReviewSheet
          matches={extractionMatches}
          onClose={() => setExtractionMatches(null)}
          onConfirm={handleConfirmExtraction}
        />
      ) : null}
    </section>
  );
}
