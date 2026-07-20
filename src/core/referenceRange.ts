import type { Gender, LabReferenceRange, LabResult, RangeStatus } from './types';

/**
 * Picks the most specific applicable range for the given gender/age:
 * gender-matched ranges win over 'all', and any age bounds present on a
 * candidate must contain the given age.
 */
export function pickApplicableRange(
  ranges: LabReferenceRange[],
  gender: Gender,
  age: number,
): LabReferenceRange | null {
  const candidates = ranges.filter((r) => {
    const genderMatches = r.gender === gender || r.gender === 'all';
    const ageMatches = (r.ageMin === null || age >= r.ageMin) && (r.ageMax === null || age <= r.ageMax);
    return genderMatches && ageMatches;
  });

  if (candidates.length === 0) return null;

  const genderSpecific = candidates.find((r) => r.gender === gender);
  return genderSpecific ?? candidates[0];
}

export function computeStatus(result: LabResult, range: LabReferenceRange | null): RangeStatus {
  if (!range) return 'unknown';

  if (result.value !== null) {
    if (range.min !== null && result.value < range.min) return 'out_of_range';
    if (range.max !== null && result.value > range.max) return 'out_of_range';
    return 'in_range';
  }

  if (result.valueQualitative !== null && range.qualitativeNormal !== null) {
    const matches = result.valueQualitative.trim().toLowerCase() === range.qualitativeNormal.trim().toLowerCase();
    return matches ? 'in_range' : 'out_of_range';
  }

  return 'unknown';
}

export function formatReferenceRange(range: LabReferenceRange | null, unit: string | null): string {
  if (!range) return 'kein Referenzbereich hinterlegt';

  if (range.qualitativeNormal !== null) {
    return `Normal: ${range.qualitativeNormal}`;
  }

  const u = unit ? ` ${unit}` : '';
  if (range.min !== null && range.max !== null) return `${formatNumber(range.min)}–${formatNumber(range.max)}${u}`;
  if (range.max !== null) return `< ${formatNumber(range.max)}${u}`;
  if (range.min !== null) return `> ${formatNumber(range.min)}${u}`;
  return 'kein Referenzbereich hinterlegt';
}

function formatNumber(n: number): string {
  return n.toString().replace('.', ',');
}
