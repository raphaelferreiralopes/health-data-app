'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';

type DocumentEntry = {
  id: string;
  title: string;
  notes: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
  createdAt: string;
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function DocumentDetailSheet({ entry, onClose }: { entry: DocumentEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-detail-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="document-detail-title" className="text-xl font-semibold text-ink">
            {entry.title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Schließen" className="rounded-full p-1 text-muted hover:bg-card hover:text-ink">
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-muted">{formatDate(entry.createdAt)}</p>

        {entry.notes ? <p className="mt-4 whitespace-pre-wrap text-sm text-ink">{entry.notes}</p> : null}

        {entry.fileData ? (
          <a
            href={entry.fileData}
            target="_blank"
            rel="noreferrer"
            className="mt-5 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
          >
            {entry.fileName ?? 'PDF öffnen'}
          </a>
        ) : null}
      </div>
    </div>
  );
}

/** Read-only view of uploaded documents -- uploading itself happens on Home (AnalysisUploadCard). */
export function DocumentsOverview() {
  const [entries, setEntries] = useState<DocumentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<DocumentEntry | null>(null);

  useEffect(() => {
    const load = async () => {
      const client = getBrowserSupabaseClient();
      if (!client) {
        setIsLoading(false);
        return;
      }

      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/analysis-uploads', { headers: { Authorization: `Bearer ${token}` } });
        const payload = (await response.json()) as { entries?: DocumentEntry[] };
        setEntries(payload.entries ?? []);
      } catch {
        // list falls back to the empty state if the lookup fails
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <p className="text-sm text-muted">
        Alle Dokumente, die du von deinem Arzt bekommst und hochlädst. Das Hochladen selbst läuft über{' '}
        <Link href="/home" className="font-medium text-brand hover:text-brand-deep">
          Home
        </Link>
        .
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted">Lade…</p>
      ) : entries.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Noch keine Dokumente hochgeladen.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
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

              {entry.notes ? <p className="line-clamp-2 text-sm text-muted">{entry.notes}</p> : null}

              {entry.fileData ? <span className="text-xs font-medium text-brand-deep">{entry.fileName ?? 'PDF'}</span> : null}
            </button>
          ))}
        </div>
      )}

      {selectedEntry ? <DocumentDetailSheet entry={selectedEntry} onClose={() => setSelectedEntry(null)} /> : null}
    </main>
  );
}
