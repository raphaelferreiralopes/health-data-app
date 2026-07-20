'use client';

import { useEffect } from 'react';
import type { ParameterWithResult } from '@/core/types';
import { formatReferenceRange } from '@/core/referenceRange';
import { StatusBadge } from './StatusBadge';

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatValue(pw: ParameterWithResult): string {
  if (pw.parameter.resultType === 'qualitative') {
    return pw.result.valueQualitative ?? '–';
  }
  const value = pw.result.value?.toString().replace('.', ',') ?? '–';
  return pw.parameter.unit ? `${value} ${pw.parameter.unit}` : value;
}

export function ParameterDetailSheet({ pw, onClose }: { pw: ParameterWithResult; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="parameter-detail-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="parameter-detail-title" className="text-xl font-semibold text-slate-900">
            {pw.parameter.name}
            {pw.parameter.abbreviation && <span className="ml-1.5 text-base font-normal text-slate-400">({pw.parameter.abbreviation})</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-2xl font-bold text-slate-900">{formatValue(pw)}</span>
          <StatusBadge status={pw.status} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Referenzbereich</dt>
          <dd className="text-slate-900">{formatReferenceRange(pw.applicableRange, pw.parameter.unit)}</dd>
          <dt className="text-slate-500">Datum der Erhebung</dt>
          <dd className="text-slate-900">{formatDate(pw.result.measuredAt)}</dd>
        </dl>

        <p className="mt-4 text-sm leading-relaxed text-slate-700">{pw.parameter.descriptionShort}</p>

        {pw.parameter.learnMoreUrl && (
          <a
            href={pw.parameter.learnMoreUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-block text-sm font-medium text-slate-900 underline underline-offset-2 hover:text-slate-600"
          >
            Weiterlesen →
          </a>
        )}
      </div>
    </div>
  );
}
