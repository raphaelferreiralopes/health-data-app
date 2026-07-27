'use client';

import { useEffect, useState } from 'react';
import { MEDICATION_CATEGORIES, MEDICATION_CATEGORY_LABELS, type MedicationCategory } from '@/core/medicationSchedule';

export type PrescriptionMatch = {
  name: string;
  description: string;
  category: MedicationCategory;
  frequencyType: 'taeglich' | 'nach_bedarf';
  timesPerDay: number;
};

export type ConfirmedMedication = {
  name: string;
  description: string;
  category: MedicationCategory;
  frequencyType: 'taeglich' | 'nach_bedarf';
  timesPerDay: number;
};

type ReviewRow = PrescriptionMatch & { included: boolean };

function toggleButtonClass(active: boolean): string {
  return `rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
    active ? 'border-brand bg-brand-pale text-brand-deep' : 'border-line bg-card text-ink hover:border-brand'
  }`;
}

export function PrescriptionReviewSheet({
  matches,
  onClose,
  onConfirm,
}: {
  matches: PrescriptionMatch[];
  onClose: () => void;
  onConfirm: (rows: ConfirmedMedication[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<ReviewRow[]>(() => matches.map((m) => ({ ...m, included: true })));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const updateRow = (index: number, patch: Partial<ReviewRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleConfirm = async () => {
    setError('');
    const selected = rows.filter((r) => r.included && r.name.trim());
    if (selected.length === 0) {
      setError('Bitte wähle mindestens ein Medikament aus.');
      return;
    }

    setIsSaving(true);
    try {
      await onConfirm(
        selected.map((r) => ({
          name: r.name.trim(),
          description: r.description.trim(),
          category: r.category,
          frequencyType: r.frequencyType,
          timesPerDay: r.timesPerDay,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescription-review-title"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="prescription-review-title" className="text-xl font-semibold text-ink">
              Erkannte Medikamente prüfen
            </h2>
            <p className="mt-1 text-sm text-muted">
              Nur ausgewählte Medikamente werden übernommen. Prüfe Name, Dosierung und Einnahme vor dem Speichern.
            </p>
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

        {rows.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Es wurden keine Medikamente auf dem Foto erkannt.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {rows.map((row, index) => (
              <div key={index} className="flex flex-col gap-2.5 rounded-xl border border-line p-3.5">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={(e) => updateRow(index, { included: e.target.checked })}
                    className="mt-2.5"
                  />
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                    placeholder="Name"
                    className="flex-1 rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm font-medium text-ink"
                  />
                </label>

                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updateRow(index, { description: e.target.value })}
                  placeholder="Dosierung / Einnahmehinweis"
                  className="ml-6 rounded-lg border border-line bg-card px-2.5 py-1.5 text-sm text-ink"
                />

                <div className="ml-6 flex flex-wrap items-center gap-2">
                  {MEDICATION_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => updateRow(index, { category })}
                      className={toggleButtonClass(row.category === category)}
                    >
                      {MEDICATION_CATEGORY_LABELS[category]}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => updateRow(index, { frequencyType: row.frequencyType === 'taeglich' ? 'nach_bedarf' : 'taeglich' })}
                    title="Klicken zum Umschalten"
                    className={toggleButtonClass(true)}
                  >
                    {row.frequencyType === 'taeglich' ? 'Täglich' : 'Bei Bedarf'}
                  </button>
                  {row.frequencyType === 'taeglich' ? (
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      x/Tag
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={row.timesPerDay}
                        onChange={(e) => updateRow(index, { timesPerDay: Number(e.target.value) || 1 })}
                        className="w-14 rounded-lg border border-line bg-card px-2 py-1 text-sm text-ink"
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        {rows.length > 0 ? (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="mt-6 w-full rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
          >
            {isSaving ? 'Speichere…' : `${rows.filter((r) => r.included).length} Medikamente übernehmen`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
