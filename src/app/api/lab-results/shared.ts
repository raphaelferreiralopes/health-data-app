export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type LabResultInput = {
  parameterId: string;
  valueNumeric?: number | null;
  valueQualitative?: string | null;
  measuredAt: string;
};

export function isValidResult(value: unknown): value is LabResultInput {
  if (!value || typeof value !== 'object') return false;
  const { parameterId, valueNumeric, valueQualitative, measuredAt } = value as Record<string, unknown>;

  if (typeof parameterId !== 'string' || parameterId.length === 0) return false;
  if (valueNumeric !== undefined && valueNumeric !== null && typeof valueNumeric !== 'number') return false;
  if (valueQualitative !== undefined && valueQualitative !== null && typeof valueQualitative !== 'string') return false;
  if (typeof measuredAt !== 'string' || !DATE_ONLY_RE.test(measuredAt)) return false;

  return true;
}
