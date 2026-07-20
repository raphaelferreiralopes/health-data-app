'use client';

import type { ParameterWithResult } from '@/core/types';
import { formatReferenceRange } from '@/core/referenceRange';
import { statusDotClassName } from './StatusBadge';

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

export function ParameterCard({ pw, onSelect }: { pw: ParameterWithResult; onSelect: (pw: ParameterWithResult) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(pw)}
      className="flex w-full flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-slate-900">{pw.parameter.name}</span>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClassName(pw.status)}`} aria-hidden />
      </div>
      <span className="text-lg font-semibold text-slate-900">{formatValue(pw)}</span>
      <span className="text-xs text-slate-500">Referenz: {formatReferenceRange(pw.applicableRange, pw.parameter.unit)}</span>
      <span className="text-xs text-slate-400">{formatDate(pw.result.measuredAt)}</span>
    </button>
  );
}
