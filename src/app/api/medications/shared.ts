import type { Medication, MedicationCategory, MedicationFrequencyType } from '@/core/medicationSchedule';

export type MedicationRow = {
  id: string;
  name: string;
  description: string;
  category: MedicationCategory;
  frequency_type: MedicationFrequencyType;
  weekdays: number[];
  interval_days: number | null;
  start_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export function toMedicationEntry(row: MedicationRow): Medication {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    frequencyType: row.frequency_type,
    weekdays: row.weekdays ?? [],
    intervalDays: row.interval_days,
    startDate: row.start_date,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const NAME_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 2000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type MedicationPayload = {
  name: string;
  description: string;
  category: MedicationCategory;
  frequencyType: MedicationFrequencyType;
  weekdays: number[];
  intervalDays: number | null;
  startDate: string;
  active: boolean;
};

/** Normalizes and validates a create/update payload; returns null if anything is out of bounds. */
export function parseMedicationPayload(body: Record<string, unknown>, { isMedicationCategory, isMedicationFrequencyType }: {
  isMedicationCategory: (value: unknown) => value is MedicationCategory;
  isMedicationFrequencyType: (value: unknown) => value is MedicationFrequencyType;
}): MedicationPayload | null {
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, NAME_MAX_LENGTH) : '';
  if (!name) return null;

  const description = typeof body.description === 'string' ? body.description.trim().slice(0, DESCRIPTION_MAX_LENGTH) : '';

  const category = isMedicationCategory(body.category) ? body.category : 'medikament';
  const frequencyType = isMedicationFrequencyType(body.frequencyType) ? body.frequencyType : 'taeglich';

  const weekdays = Array.isArray(body.weekdays)
    ? Array.from(new Set(body.weekdays.filter((day): day is number => typeof day === 'number' && Number.isInteger(day) && day >= 0 && day <= 6)))
    : [];

  const intervalDays =
    typeof body.intervalDays === 'number' && Number.isInteger(body.intervalDays) && body.intervalDays >= 1 && body.intervalDays <= 365
      ? body.intervalDays
      : null;

  const startDate = typeof body.startDate === 'string' && DATE_PATTERN.test(body.startDate) ? body.startDate : new Date().toISOString().slice(0, 10);

  const active = typeof body.active === 'boolean' ? body.active : true;

  return { name, description, category, frequencyType, weekdays, intervalDays, startDate, active };
}
