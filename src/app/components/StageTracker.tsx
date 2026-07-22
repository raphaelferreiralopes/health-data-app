'use client';

import { PROCESS_STAGES, PROCESS_STAGE_LABELS, processStageIndex, type ProcessStageStatus } from '@/core/processStages';

export function StageTracker({ status }: { status: ProcessStageStatus }) {
  const activeIndex = processStageIndex(status);
  return (
    <div className="mt-4 flex items-center gap-2">
      {PROCESS_STAGES.map((stage, index) => (
        <div key={stage} className="flex flex-1 items-center gap-2">
          <div className="flex flex-col items-center gap-1.5">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                index <= activeIndex ? 'bg-brand text-white' : 'border border-line text-muted'
              }`}
            >
              {index <= activeIndex ? '✓' : index + 1}
            </span>
            <span className={`hidden text-center text-[11px] font-medium sm:inline ${index <= activeIndex ? 'text-ink' : 'text-muted'}`}>
              {PROCESS_STAGE_LABELS[stage]}
            </span>
          </div>
          {index < PROCESS_STAGES.length - 1 ? (
            <div className={`mb-4 h-px flex-1 sm:mb-6 ${index < activeIndex ? 'bg-brand' : 'bg-line'}`} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function StageActions({
  status,
  isSaving,
  onAdvance,
}: {
  status: ProcessStageStatus;
  isSaving: boolean;
  onAdvance: (nextStatus: ProcessStageStatus) => void;
}) {
  const currentIndex = processStageIndex(status);
  const nextStage = PROCESS_STAGES[currentIndex + 1];

  return (
    <div className="mt-5 flex items-center gap-4">
      {nextStage ? (
        <button
          type="button"
          onClick={() => onAdvance(nextStage)}
          disabled={isSaving}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
        >
          {PROCESS_STAGE_LABELS[nextStage]} markieren
        </button>
      ) : (
        <span className="text-sm font-medium text-brand-deep">Abgeschlossen ✓</span>
      )}

      {currentIndex >= 0 ? (
        <button
          type="button"
          onClick={() => onAdvance(PROCESS_STAGES[currentIndex - 1] ?? 'offen')}
          disabled={isSaving}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          ← Zurück
        </button>
      ) : null}
    </div>
  );
}
