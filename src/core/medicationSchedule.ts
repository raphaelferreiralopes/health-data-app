/**
 * Domain logic for the Medikamente/Supplements tab: a medication is
 * configured once with a frequency, and the daily checklist is derived from
 * that frequency for whichever date is being viewed (see isMedicationDueOn).
 */

export type MedicationCategory = 'medikament' | 'supplement';
export type MedicationFrequencyType = 'taeglich' | 'wochentage' | 'intervall' | 'nach_bedarf';

export const MEDICATION_CATEGORIES: MedicationCategory[] = ['medikament', 'supplement'];
export const MEDICATION_FREQUENCY_TYPES: MedicationFrequencyType[] = ['taeglich', 'wochentage', 'intervall', 'nach_bedarf'];

export const MEDICATION_CATEGORY_LABELS: Record<MedicationCategory, string> = {
  medikament: 'Medikament',
  supplement: 'Supplement',
};

export const MEDICATION_FREQUENCY_LABELS: Record<MedicationFrequencyType, string> = {
  taeglich: 'Täglich',
  wochentage: 'An bestimmten Wochentagen',
  intervall: 'Alle X Tage',
  nach_bedarf: 'Nach Bedarf',
};

/** JS Date#getDay() order: 0 = Sonntag ... 6 = Samstag. */
export const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function isMedicationCategory(value: unknown): value is MedicationCategory {
  return typeof value === 'string' && (MEDICATION_CATEGORIES as string[]).includes(value);
}

export function isMedicationFrequencyType(value: unknown): value is MedicationFrequencyType {
  return typeof value === 'string' && (MEDICATION_FREQUENCY_TYPES as string[]).includes(value);
}

export type Medication = {
  id: string;
  name: string;
  description: string;
  category: MedicationCategory;
  frequencyType: MedicationFrequencyType;
  weekdays: number[];
  intervalDays: number | null;
  timesPerDay: number;
  startDate: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const MIN_TIMES_PER_DAY = 1;
export const MAX_TIMES_PER_DAY = 6;

/** Generic per-dose labels ("1. Einnahme", "2. Einnahme", ...) since there's no specific time-of-day config. */
export function doseLabel(doseIndex: number): string {
  return `${doseIndex + 1}. Einnahme`;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const to = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** Whether a medication is scheduled for the given date (YYYY-MM-DD), based on its frequency settings. */
export function isMedicationDueOn(
  medication: Pick<Medication, 'frequencyType' | 'weekdays' | 'intervalDays' | 'startDate'>,
  dateIso: string,
): boolean {
  if (dateIso < medication.startDate) return false;

  switch (medication.frequencyType) {
    case 'taeglich':
    case 'nach_bedarf':
      return true;
    case 'wochentage': {
      const weekday = new Date(`${dateIso}T00:00:00Z`).getUTCDay();
      return medication.weekdays.includes(weekday);
    }
    case 'intervall': {
      const interval = medication.intervalDays ?? 1;
      if (interval <= 1) return true;
      return daysBetween(medication.startDate, dateIso) % interval === 0;
    }
    default:
      return false;
  }
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function addDaysToIso(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
