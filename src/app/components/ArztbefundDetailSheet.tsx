'use client';

import { useEffect, useState } from 'react';

export type ArztbefundEntry = {
  id: string;
  title: string;
  fileName?: string;
  fileData: string;
  explanationLevel1: string;
  explanationLevel2: string;
  explanationLevel3: string;
  createdAt: string;
};

const LEVELS = [
  { level: 1, label: 'Einfach' },
  { level: 2, label: 'Standard' },
  { level: 3, label: 'Profi' },
] as const;

function explanationForLevel(entry: ArztbefundEntry, level: 1 | 2 | 3): string {
  if (level === 1) return entry.explanationLevel1;
  if (level === 3) return entry.explanationLevel3;
  return entry.explanationLevel2;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ArztbefundDetailSheet({
  entry,
  onClose,
  onDelete,
}: {
  entry: ArztbefundEntry;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [level, setLevel] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="arztbefund-detail-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="arztbefund-detail-title" className="text-xl font-semibold text-ink">
              {entry.title}
            </h2>
            <p className="mt-1 text-xs text-muted">{formatDate(entry.createdAt)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-full p-1 text-muted hover:bg-card hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 inline-flex self-start rounded-lg bg-card p-1" role="tablist" aria-label="Erklärungsstufe">
          {LEVELS.map(({ level: l, label }) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={level === l}
              onClick={() => setLevel(l)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                level === l ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{explanationForLevel(entry, level)}</p>

        <p className="mt-4 text-xs text-muted">
          Diese Erklärung wurde automatisch erstellt und ersetzt keine ärztliche Beratung.
        </p>

        <iframe
          src={entry.fileData}
          title={entry.fileName ?? 'Arztbefund-Vorschau'}
          className="mt-5 h-[50vh] w-full rounded-xl border border-line"
        />

        <div className="mt-3 flex items-center justify-between gap-4">
          <a href={entry.fileData} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand hover:text-brand-deep">
            {entry.fileName ?? 'PDF'} in neuem Tab öffnen
          </a>
          <button type="button" onClick={onDelete} className="text-sm font-medium text-muted hover:text-red-600">
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
