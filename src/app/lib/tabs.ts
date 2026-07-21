import type { Tab } from '@/core/types';

export const TABS: { value: Tab; label: string }[] = [
  { value: 'blutanalyse', label: 'Blutdiagnostik' },
  { value: 'urin', label: 'Urindiagnostik' },
  { value: 'stuhl', label: 'Stuhldiagnostik' },
  { value: 'allergie', label: 'Allergiediagnostik' },
];

export function isTab(value: string): value is Tab {
  return TABS.some((t) => t.value === value);
}
