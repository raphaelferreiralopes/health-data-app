/**
 * Shared 4-stage checklist used by both the "Empfohlene Tests" phases and
 * freely-started Prozesse (Grippe/Rückenschmerzen/Knie Operation): a process
 * starts "offen" and is walked forward/back through these stages by hand.
 */

export type ProcessStageStatus = 'offen' | 'termin_gebucht' | 'gemacht' | 'resultat_erhalten' | 'hochgeladen';

export const PROCESS_STAGES: ProcessStageStatus[] = ['termin_gebucht', 'gemacht', 'resultat_erhalten', 'hochgeladen'];

export const PROCESS_STAGE_LABELS: Record<ProcessStageStatus, string> = {
  offen: 'Offen',
  termin_gebucht: 'Termin gebucht',
  gemacht: 'Gemacht',
  resultat_erhalten: 'Resultat erhalten',
  hochgeladen: 'Hochgeladen',
};

export function processStageIndex(status: ProcessStageStatus): number {
  return PROCESS_STAGES.indexOf(status);
}
