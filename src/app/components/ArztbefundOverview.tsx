'use client';

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import { ArztbefundDetailSheet, ArztbefundEntry } from './ArztbefundDetailSheet';
import { ConfirmedLabResult, ExtractionMatch, ExtractionReviewSheet } from './ExtractionReviewSheet';

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

export function ArztbefundOverview() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<ArztbefundEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ArztbefundEntry | null>(null);

  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [extractionMatches, setExtractionMatches] = useState<ExtractionMatch[] | null>(null);

  useEffect(() => {
    const init = async () => {
      const client = getBrowserSupabaseClient();
      if (!client) {
        setIsLoading(false);
        return;
      }

      const { data } = await client.auth.getSession();
      const token = data.session?.access_token ?? null;
      setAccessToken(token);

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/arztbefund-uploads', { headers: { Authorization: `Bearer ${token}` } });
        const payload = (await response.json()) as { entries?: ArztbefundEntry[] };
        setEntries(payload.entries ?? []);
      } catch {
        // list falls back to the empty state if the lookup fails
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.type !== 'application/pdf') {
      setErrorMessage('Bitte nur PDF-Dateien hochladen.');
      event.target.value = '';
      setSelectedFile(null);
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedFile || !accessToken) {
      return;
    }

    setErrorMessage('');
    setIsExplaining(true);

    try {
      const fileData = await readFileAsDataUrl(selectedFile);
      const response = await fetch('/api/arztbefund-uploads/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileData, fileName: selectedFile.name, title: title.trim() || undefined }),
      });

      const payload = (await response.json()) as { entry?: ArztbefundEntry; matches?: ExtractionMatch[]; error?: string };
      if (!response.ok || !payload.entry) {
        throw new Error(payload.error ?? 'Auswertung fehlgeschlagen.');
      }

      setEntries((current) => [payload.entry as ArztbefundEntry, ...current]);
      if (payload.matches && payload.matches.length > 0) {
        setExtractionMatches(payload.matches);
      }
      setTitle('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Auswertung fehlgeschlagen.');
    } finally {
      setIsExplaining(false);
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
  };

  const handleDelete = async (entryId: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== entryId));
    setSelectedEntry(null);

    if (!accessToken) {
      return;
    }

    try {
      await fetch(`/api/arztbefund-uploads/${entryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch {
      // best-effort; reappears on next reload if the delete failed
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <p className="text-sm text-muted">
        Lade einen Arztbefund als PDF hoch: Die KI erklärt dir, was darin gefunden wurde -- in drei
        Verständlichkeitsstufen von &bdquo;Einfach&ldquo; bis &bdquo;Profi&ldquo; -- und übernimmt erkannte Laborwerte
        auf Wunsch direkt in die Diagnostik.
      </p>

      {!isLoading && !accessToken ? (
        <p className="mt-6 text-sm text-muted">Melde dich an, um Arztbefunde hochzuladen und auswerten zu lassen.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          <label className="block text-sm font-medium text-ink">
            Titel (optional)
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z. B. Laborbefund vom 20.07."
              className="mt-2 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
            />
          </label>

          <label className="block text-sm font-medium text-ink">
            Arztbefund (PDF)
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="mt-2 block w-full text-sm text-muted file:mr-3 file:rounded-full file:border-0 file:bg-brand-pale file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-deep hover:file:bg-brand/20"
            />
          </label>
          {selectedFile ? <p className="text-xs text-muted">Ausgewählt: {selectedFile.name}</p> : null}

          <button
            type="submit"
            disabled={!selectedFile || isExplaining}
            className="mt-2 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
          >
            {isExplaining ? 'Befund wird ausgewertet…' : 'Hochladen & auswerten'}
          </button>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        </form>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Erklärte Arztbefunde</h2>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted">Lade…</p>
        ) : entries.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Noch keine Arztbefunde hochgeladen.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedEntry(entry)}
                className="flex w-full flex-col items-start gap-1 rounded-2xl border border-line bg-surface p-6 text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <div className="flex w-full flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-ink">{entry.title}</h3>
                  <span className="text-xs text-muted">{formatDate(entry.createdAt)}</span>
                </div>
                <p className="line-clamp-2 text-sm text-muted">{entry.explanationLevel1}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEntry ? (
        <ArztbefundDetailSheet
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onDelete={() => handleDelete(selectedEntry.id)}
        />
      ) : null}

      {extractionMatches ? (
        <ExtractionReviewSheet
          matches={extractionMatches}
          onClose={() => setExtractionMatches(null)}
          onConfirm={handleConfirmExtraction}
        />
      ) : null}
    </main>
  );
}
