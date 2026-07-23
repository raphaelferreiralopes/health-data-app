'use client';

import { useEffect } from 'react';
import { BIOMARKERS_BY_ORGAN, BIOMARKER_HINWEISE, type Biomarker, type BiomarkerCategory, organName } from './biomarkerMapData';

const CATEGORY_STYLES: Record<BiomarkerCategory, string> = {
  Kern: 'bg-brand-pale text-brand-deep',
  Ergänzend: 'bg-card text-muted ring-1 ring-inset ring-line',
};

function CategoryBadge({ kategorie }: { kategorie: BiomarkerCategory }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[kategorie]}`}>
      {kategorie}
    </span>
  );
}

function BiomarkerRow({ biomarker }: { biomarker: Biomarker }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{biomarker.name}</h3>
        <CategoryBadge kategorie={biomarker.kategorie} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-muted">Zielbereich</dt>
        <dd className="text-ink">{biomarker.zielbereich}</dd>
        <dt className="text-muted">Testintervall</dt>
        <dd className="text-ink">{biomarker.testintervall}</dd>
      </dl>
      <p className="mt-2 text-xs leading-relaxed text-muted">{biomarker.anmerkung}</p>
    </div>
  );
}

export function OrganSheet({ organId, onClose }: { organId: string; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const biomarkers = BIOMARKERS_BY_ORGAN[organId] ?? [];
  const kernMarkers = biomarkers.filter((b) => b.kategorie === 'Kern');
  const ergaenzendeMarkers = biomarkers.filter((b) => b.kategorie === 'Ergänzend');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="organ-sheet-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="organ-sheet-title" className="text-xl font-semibold text-ink">
            {organName(organId)}
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

        {biomarkers.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-card p-6 text-center text-sm text-muted">
            Für {organName(organId)} sind noch keine BioMarker hinterlegt. Diese Ansicht folgt in einer späteren Version.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-5">
            {kernMarkers.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Kernmarker</h3>
                <div className="flex flex-col gap-3">
                  {kernMarkers.map((biomarker) => (
                    <BiomarkerRow key={biomarker.name} biomarker={biomarker} />
                  ))}
                </div>
              </div>
            )}

            {ergaenzendeMarkers.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Ergänzende Marker</h3>
                <div className="flex flex-col gap-3">
                  {ergaenzendeMarkers.map((biomarker) => (
                    <BiomarkerRow key={biomarker.name} biomarker={biomarker} />
                  ))}
                </div>
              </div>
            )}

            <ul className="mt-1 flex flex-col gap-1 border-t border-line pt-4 text-xs leading-relaxed text-muted">
              {BIOMARKER_HINWEISE.map((hinweis) => (
                <li key={hinweis}>{hinweis}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
