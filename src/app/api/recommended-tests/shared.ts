import type { ProcessStageStatus } from '@/core/processStages';

export type RecommendedTestKey =
  | 'vitalwerte_arzt'
  | 'grosses_blutbild'
  | 'urin_probe'
  | 'zahnarzt'
  | 'augenarzt'
  | 'hno_arzt'
  | 'hautarzt'
  | 'allergologe'
  | 'hautkrebs_screening'
  | 'darmkrebsvorsorge'
  | 'mammographie_gyn'
  | 'prostata_vorsorge';

export type RecommendedTestStatus = ProcessStageStatus;

export type RecommendedTestPhase = 1 | 2 | 3;

const PHASE_1_KEYS: RecommendedTestKey[] = ['vitalwerte_arzt', 'grosses_blutbild', 'urin_probe'];
const PHASE_2_KEYS: RecommendedTestKey[] = ['zahnarzt', 'augenarzt', 'hno_arzt', 'hautarzt', 'allergologe'];
const PHASE_3_UNIVERSAL_KEYS: RecommendedTestKey[] = ['hautkrebs_screening', 'darmkrebsvorsorge'];

/** Fixed display order for all known keys, used to sort a fetched row set. */
export const RECOMMENDED_TEST_KEY_ORDER: RecommendedTestKey[] = [
  ...PHASE_1_KEYS,
  ...PHASE_2_KEYS,
  ...PHASE_3_UNIVERSAL_KEYS,
  'mammographie_gyn',
  'prostata_vorsorge',
];

/**
 * Full set of (phase, testKey) pairs to seed for a newly-completed body
 * check. Phase 3 includes the gender-specific screening for the recorded
 * biological_sex; if it's unknown (shouldn't happen for a completed check,
 * the wizard requires it), both are included so nothing gets silently dropped.
 */
export function planRecommendedTests(biologicalSex: 'm' | 'f' | null): Array<{ phase: RecommendedTestPhase; testKey: RecommendedTestKey }> {
  const phase3Keys: RecommendedTestKey[] = [...PHASE_3_UNIVERSAL_KEYS];
  if (biologicalSex === 'f') phase3Keys.push('mammographie_gyn');
  else if (biologicalSex === 'm') phase3Keys.push('prostata_vorsorge');
  else phase3Keys.push('mammographie_gyn', 'prostata_vorsorge');

  return [
    ...PHASE_1_KEYS.map((testKey) => ({ phase: 1 as const, testKey })),
    ...PHASE_2_KEYS.map((testKey) => ({ phase: 2 as const, testKey })),
    ...phase3Keys.map((testKey) => ({ phase: 3 as const, testKey })),
  ];
}

export type RecommendedTestRow = {
  id: string;
  body_check_id: string;
  test_key: RecommendedTestKey;
  phase: RecommendedTestPhase;
  status: RecommendedTestStatus;
  created_at: string;
  updated_at: string;
};

export function toRecommendedTestEntry(row: RecommendedTestRow) {
  return {
    id: row.id,
    bodyCheckId: row.body_check_id,
    testKey: row.test_key,
    phase: row.phase,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
