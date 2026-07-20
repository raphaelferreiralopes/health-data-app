import type { Tab } from '@/core/types';

export const TABS: { value: Tab; label: string }[] = [
  { value: 'blutanalyse', label: 'Blutanalyse' },
  { value: 'urin', label: 'Urin-Analyse' },
  { value: 'stuhl', label: 'Stuhl-Analyse' },
  { value: 'allergie', label: 'Allergie-Analyse' },
];

export function isTab(value: string): value is Tab {
  return TABS.some((t) => t.value === value);
}
