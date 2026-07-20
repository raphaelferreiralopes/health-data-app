import type { RangeStatus } from '@/core/types';

const STYLES: Record<RangeStatus, { label: string; className: string }> = {
  in_range: { label: 'im Referenzbereich', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  out_of_range: { label: 'außerhalb des Referenzbereichs', className: 'bg-red-50 text-red-700 ring-red-600/20' },
  unknown: { label: 'kein Referenzbereich', className: 'bg-slate-100 text-slate-500 ring-slate-500/20' },
};

export function StatusBadge({ status }: { status: RangeStatus }) {
  const style = STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.className}`}>
      {style.label}
    </span>
  );
}

export function statusDotClassName(status: RangeStatus): string {
  if (status === 'in_range') return 'bg-emerald-500';
  if (status === 'out_of_range') return 'bg-red-500';
  return 'bg-slate-300';
}
