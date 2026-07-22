export type FamilyHistoryPayload = {
  answers: Record<string, boolean>;
  sectionNotes: Record<string, string>;
};

export type BodyCheckPhase = 'measurements' | 'documents' | 'questionnaire' | 'summary' | 'done';
export type BodyCheckStatus = 'in_progress' | 'completed';

export type BodyCheckRow = {
  id: string;
  height_cm: number | null;
  weight_kg: number | null;
  biological_sex: 'm' | 'f' | null;
  wants_document_upload: boolean | null;
  family_history: FamilyHistoryPayload;
  status: BodyCheckStatus;
  phase: BodyCheckPhase;
  question_index: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export function toBodyCheckEntry(row: BodyCheckRow) {
  return {
    id: row.id,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    biologicalSex: row.biological_sex,
    wantsDocumentUpload: row.wants_document_upload,
    familyHistory: row.family_history,
    status: row.status,
    phase: row.phase,
    questionIndex: row.question_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}
