'use client';

import { useEffect } from 'react';

export function OrganSheet({ organName, onClose }: { organName: string; onClose: () => void }) {
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
        aria-labelledby="organ-sheet-title"
        className="max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="organ-sheet-title" className="text-xl font-semibold text-ink">
            {organName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-full p-1 text-muted hover:bg-card hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-line bg-card p-6 text-center text-sm text-muted">
          Für {organName} sind noch keine BioMarker hinterlegt. Diese Ansicht folgt in einer späteren Version.
        </div>
      </div>
    </div>
  );
}
