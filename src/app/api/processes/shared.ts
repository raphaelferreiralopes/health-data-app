import type { ProcessStageStatus } from '@/core/processStages';

export type ProcessType = 'grippe' | 'ruecken_schmerzen' | 'knie_operation';

export const PROCESS_TYPES: ProcessType[] = ['grippe', 'ruecken_schmerzen', 'knie_operation'];

export type ProcessRow = {
  id: string;
  process_type: ProcessType;
  status: ProcessStageStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export function toProcessEntry(row: ProcessRow) {
  return {
    id: row.id,
    processType: row.process_type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}
