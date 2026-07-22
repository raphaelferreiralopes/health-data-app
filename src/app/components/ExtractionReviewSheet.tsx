'use client';

import { useEffect, useState } from 'react';

export type ExtractionMatch = {
  parameterId: string;
  parameterKey: string;
  parameterName: string;
  unit: string | null;
  resultType: 'numeric' | 'qualitative';
  valueNumeric: number | null;
  valueQualitative: string | null;
  measuredAt: string | null;
};

export type ConfirmedLabResult = {
  parameterId: string;
  valueNumeric: number | null;
  valueQualitative: string | null;
  measuredAt: string;
};

type ReviewRow = ExtractionMatch & { included: boolean; measuredAt: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExtractionReviewSheet({
  matches,
  onClose,
  onConfirm,
}: {
  matches: ExtractionMatch[];
  onClose: () => void;
  onConfirm: (rows: ConfirmedLabResult[]) => Promise<void>;
}) {
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    matches.map((m) => ({ ...m, included: true, measuredAt: m.measuredAt ?? todayIso() })),
  );
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
    const selected = rows.filter((r) => r.included);
    if (selected.length === 0) {
      setError('Bitte wähle mindestens einen Wert aus.');
      return;
    }

    setIsSaving(true);
    try {
      await onConfirm(
        selected.map((r) => ({
          parameterId: r.parameterId,
          valueNumeric: r.resultType === 'numeric' ? r.valueNumeric : null,
          valueQualitative: r.resultType === 'qualitative' ? r.valueQualitative : null,
          measuredAt: r.measuredAt,
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
        aria-labelledby="extraction-review-title"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="extraction-review-title" className="text-xl font-semibold text-ink">
              Erkannte Werte prüfen
            </h2>
            <p className="mt-1 text-sm text-muted">
              Nur ausgewählte Werte werden gespeichert. Prüfe Werte und Datum vor dem Übernehmen.
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
          <p className="mt-6 text-sm text-muted">Es wurden keine passenden Werte im Dokument erkannt.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {rows.map((row, index) => (
              <div
                key={`${row.parameterId}-${index}`}
                className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <label className="flex flex-1 items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={(e) => updateRow(index, { included: e.target.checked })}
                    className="mt-0.5"
                  />
                  <span className="text-ink">
                    {row.parameterName}
                    {row.unit ? <span className="text-muted"> ({row.unit})</span> : null}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {row.resultType === 'numeric' ? (
                    <input
                      type="number"
                      step="any"
                      value={row.valueNumeric ?? ''}
                      onChange={(e) =>
                        updateRow(index, { valueNumeric: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      className="w-28 rounded-lg border border-line bg-card px-2 py-1 text-sm text-ink"
                    />
                  ) : (
                    <input
                      type="text"
                      value={row.valueQualitative ?? ''}
                      onChange={(e) => updateRow(index, { valueQualitative: e.target.value })}
                      className="w-32 rounded-lg border border-line bg-card px-2 py-1 text-sm text-ink"
                    />
                  )}
                  <input
                    type="date"
                    value={row.measuredAt}
                    onChange={(e) => updateRow(index, { measuredAt: e.target.value })}
                    className="rounded-lg border border-line bg-card px-2 py-1 text-sm text-ink"
                  />
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
            {isSaving ? 'Speichere…' : `${rows.filter((r) => r.included).length} Werte übernehmen`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
