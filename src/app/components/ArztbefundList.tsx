'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import { ArztbefundDetailSheet, ArztbefundEntry } from './ArztbefundDetailSheet';

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ArztbefundList() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<ArztbefundEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<ArztbefundEntry | null>(null);

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
      {!isLoading && !accessToken ? (
        <p className="text-sm text-muted">Melde dich an, um deine hochgeladenen Arztbefunde zu sehen.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted">Lade…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted">
          Noch keine Arztbefunde hochgeladen. Lade sie im{' '}
          <a href="/home" className="font-medium text-brand hover:text-brand-deep">
            Home-Tab
          </a>{' '}
          hoch.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
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

      {selectedEntry ? (
        <ArztbefundDetailSheet
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onDelete={() => handleDelete(selectedEntry.id)}
        />
      ) : null}
    </main>
  );
}
