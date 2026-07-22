'use client';

import { useEffect, useRef, useState } from 'react';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import { FAMILY_HISTORY_QUESTION_COUNT, FAMILY_HISTORY_SECTIONS, type FamilyHistoryQuestion } from '@/core/familyHistoryQuestionnaire';

type Phase = 'measurements' | 'documents' | 'questionnaire' | 'summary' | 'done';

export type FamilyHistoryPayload = {
  answers: Record<string, boolean>;
  sectionNotes: Record<string, string>;
};

export type BodyCheckDraft = {
  id: string;
  heightCm: number | null;
  weightKg: number | null;
  biologicalSex: 'm' | 'f' | null;
  wantsDocumentUpload: boolean | null;
  familyHistory: FamilyHistoryPayload;
  phase: Phase;
  questionIndex: number;
};

type FlatStep =
  | { type: 'question'; sectionKey: string; sectionTitle: string; question: FamilyHistoryQuestion; questionNumber: number; progressCount: number }
  | { type: 'details'; sectionKey: string; sectionTitle: string; progressCount: number };

const FLAT_STEPS: FlatStep[] = (() => {
  const steps: FlatStep[] = [];
  let running = 0;
  for (const section of FAMILY_HISTORY_SECTIONS) {
    for (const question of section.questions) {
      running += 1;
      steps.push({ type: 'question', sectionKey: section.key, sectionTitle: section.title, question, questionNumber: running, progressCount: running });
    }
    steps.push({ type: 'details', sectionKey: section.key, sectionTitle: section.title, progressCount: running });
  }
  return steps;
})();

const MACRO_STEPS = [
  { label: 'Allgemein' },
  { label: 'Unterlagen' },
  { label: 'Genetisches Risiko' },
] as const;

function macroStepIndexForPhase(phase: Phase): number {
  if (phase === 'measurements') return 0;
  if (phase === 'documents') return 1;
  return 2;
}

function toggleButtonClass(active: boolean): string {
  return `flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
    active ? 'border-brand bg-brand-pale text-brand-deep' : 'border-line bg-card text-ink hover:border-brand'
  }`;
}

type Snapshot = {
  heightCm: number | null;
  weightKg: number | null;
  biologicalSex: 'm' | 'f' | null;
  wantsDocumentUpload: boolean | null;
  familyHistory: FamilyHistoryPayload;
  phase: Phase;
  questionIndex: number;
};

function MacroSteps({ phase }: { phase: Phase }) {
  const activeIndex = macroStepIndexForPhase(phase);
  return (
    <div className="mt-4 flex items-center gap-2">
      {MACRO_STEPS.map((step, index) => (
        <div key={step.label} className="flex flex-1 items-center gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                index < activeIndex
                  ? 'bg-brand text-white'
                  : index === activeIndex
                    ? 'border-2 border-brand text-brand-deep'
                    : 'border border-line text-muted'
              }`}
            >
              {index < activeIndex ? '✓' : index + 1}
            </span>
            <span className={`hidden text-xs font-medium sm:inline ${index === activeIndex ? 'text-ink' : 'text-muted'}`}>
              {step.label}
            </span>
          </div>
          {index < MACRO_STEPS.length - 1 ? (
            <div className={`h-px flex-1 ${index < activeIndex ? 'bg-brand' : 'bg-line'}`} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function GanzKoerperCheckSheet({
  isOpen,
  draft,
  onClose,
  onDraftStarted,
  onCompleted,
}: {
  isOpen: boolean;
  draft: BodyCheckDraft | null;
  onClose: () => void;
  onDraftStarted: () => void;
  onCompleted: (completedAt: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>(draft?.phase ?? 'measurements');
  const [heightCm, setHeightCm] = useState(draft?.heightCm != null ? String(draft.heightCm) : '');
  const [weightKg, setWeightKg] = useState(draft?.weightKg != null ? String(draft.weightKg) : '');
  const [biologicalSex, setBiologicalSex] = useState<'m' | 'f' | null>(draft?.biologicalSex ?? null);
  const [measurementsError, setMeasurementsError] = useState('');

  const [wantsDocumentUpload, setWantsDocumentUpload] = useState<boolean | null>(draft?.wantsDocumentUpload ?? null);

  const [qIndex, setQIndex] = useState(draft?.questionIndex ?? 0);
  const [answers, setAnswers] = useState<Record<string, boolean>>(draft?.familyHistory.answers ?? {});
  const [sectionNotes, setSectionNotes] = useState<Record<string, string>>(draft?.familyHistory.sectionNotes ?? {});

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const draftIdRef = useRef<string | null>(draft?.id ?? null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const client = getBrowserSupabaseClient();
    if (!client) return;
    client.auth.getSession().then(({ data }) => setAccessToken(data.session?.access_token ?? null));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const buildSnapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
    heightCm: heightCm ? Number(heightCm) : null,
    weightKg: weightKg ? Number(weightKg) : null,
    biologicalSex,
    wantsDocumentUpload,
    familyHistory: { answers, sectionNotes },
    phase,
    questionIndex: qIndex,
    ...overrides,
  });

  // Chains autosave calls so two rapid steps can't both see "no draft yet" and create duplicate rows.
  const persist = (snapshot: Snapshot, extra?: { completed?: boolean }) => {
    saveChainRef.current = saveChainRef.current.then(async () => {
      if (!accessToken) return;
      try {
        if (!draftIdRef.current) {
          const response = await fetch('/api/body-checks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify(snapshot),
          });
          const payload = (await response.json()) as { entry?: { id: string } };
          if (payload.entry?.id) {
            draftIdRef.current = payload.entry.id;
            onDraftStarted();
          }
        } else {
          await fetch(`/api/body-checks/${draftIdRef.current}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ ...snapshot, ...extra }),
          });
        }
      } catch {
        // Best-effort autosave -- resuming later just starts from the last successfully saved step.
      }
    });
  };

  const resetWizard = () => {
    draftIdRef.current = null;
    setPhase('measurements');
    setHeightCm('');
    setWeightKg('');
    setBiologicalSex(null);
    setWantsDocumentUpload(null);
    setQIndex(0);
    setAnswers({});
    setSectionNotes({});
    setMeasurementsError('');
    setSubmitError('');
  };

  const handleMeasurementsNext = () => {
    const height = Number(heightCm);
    const weight = Number(weightKg);
    if (!height || height <= 0 || !weight || weight <= 0 || !biologicalSex) {
      setMeasurementsError('Bitte fülle Größe, Gewicht und biologisches Geschlecht aus.');
      return;
    }
    setMeasurementsError('');
    setPhase('documents');
    persist(buildSnapshot({ heightCm: height, weightKg: weight, phase: 'documents', questionIndex: 0 }));
  };

  const handleDocumentsChoice = (wantsUpload: boolean) => {
    setWantsDocumentUpload(wantsUpload);
    if (!wantsUpload) {
      setPhase('questionnaire');
      persist(buildSnapshot({ wantsDocumentUpload: wantsUpload, phase: 'questionnaire', questionIndex: 0 }));
    } else {
      persist(buildSnapshot({ wantsDocumentUpload: wantsUpload }));
    }
  };

  const handleDocumentsContinue = () => {
    setPhase('questionnaire');
    persist(buildSnapshot({ phase: 'questionnaire', questionIndex: 0 }));
  };

  const advance = (index: number, overrides: Partial<Snapshot> = {}) => {
    if (index >= FLAT_STEPS.length) {
      setPhase('summary');
      persist(buildSnapshot({ phase: 'summary', questionIndex: index, ...overrides }));
      return;
    }
    setPhase('questionnaire');
    setQIndex(index);
    persist(buildSnapshot({ phase: 'questionnaire', questionIndex: index, ...overrides }));
  };

  const goToStep = (index: number) => {
    if (index < 0) {
      setPhase('documents');
      persist(buildSnapshot({ phase: 'documents' }));
      return;
    }
    advance(index);
  };

  const answerAndAdvance = (questionKey: string, value: boolean) => {
    const nextAnswers = { ...answers, [questionKey]: value };
    setAnswers(nextAnswers);
    advance(qIndex + 1, { familyHistory: { answers: nextAnswers, sectionNotes } });
  };

  const handleSectionNoteChange = (sectionKey: string, value: string) => {
    setSectionNotes((current) => ({ ...current, [sectionKey]: value }));
  };

  const yesCount = Object.values(answers).filter(Boolean).length;

  const handleSubmit = async () => {
    if (!accessToken) {
      setSubmitError('Nicht angemeldet.');
      return;
    }
    if (!draftIdRef.current) {
      setSubmitError('Kein Entwurf gefunden.');
      return;
    }
    setSubmitError('');
    setIsSaving(true);
    try {
      const response = await fetch(`/api/body-checks/${draftIdRef.current}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ ...buildSnapshot({ phase: 'done' }), completed: true }),
      });
      const payload = (await response.json()) as { error?: string; entry?: { completedAt: string | null } };
      if (!response.ok) {
        throw new Error(payload.error ?? 'Speichern fehlgeschlagen.');
      }
      setPhase('done');
      onCompleted(payload.entry?.completedAt ?? new Date().toISOString());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDoneClose = () => {
    resetWizard();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const currentStep = phase === 'questionnaire' ? FLAT_STEPS[qIndex] : null;
  const progressPercent = currentStep ? Math.round((currentStep.progressCount / FAMILY_HISTORY_QUESTION_COUNT) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="body-check-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="body-check-title" className="text-xl font-semibold text-ink">
            Ganz-Körper Check
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="rounded-full p-1 text-muted hover:bg-card hover:text-ink"
          >
            ✕
          </button>
        </div>

        {phase !== 'done' ? <MacroSteps phase={phase} /> : null}

        {phase === 'questionnaire' && currentStep ? (
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-card">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        ) : null}

        {phase === 'measurements' ? (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-muted">
              Zum Start ein paar Basisdaten zu deinem Körper. Diese helfen, spätere Auswertungen passend einzuordnen.
            </p>
            <label className="block text-sm font-medium text-ink">
              Größe (cm)
              <input
                type="number"
                inputMode="numeric"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="z. B. 175"
                className="mt-2 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
              />
            </label>
            <label className="block text-sm font-medium text-ink">
              Gewicht (kg)
              <input
                type="number"
                inputMode="numeric"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="z. B. 70"
                className="mt-2 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
              />
            </label>
            <div>
              <span className="block text-sm font-medium text-ink">Biologisches Geschlecht</span>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setBiologicalSex('m')} className={toggleButtonClass(biologicalSex === 'm')}>
                  Männlich
                </button>
                <button type="button" onClick={() => setBiologicalSex('f')} className={toggleButtonClass(biologicalSex === 'f')}>
                  Weiblich
                </button>
              </div>
            </div>

            {measurementsError ? <p className="text-sm text-red-600">{measurementsError}</p> : null}

            <button
              type="button"
              onClick={handleMeasurementsNext}
              className="mt-2 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
            >
              Weiter
            </button>
          </div>
        ) : null}

        {phase === 'documents' ? (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-ink">Möchtest du im nächsten Schritt Krankenakten oder sonstige Unterlagen hochladen?</p>

            {wantsDocumentUpload === true ? (
              <div className="rounded-xl border border-line bg-card p-4">
                <p className="text-sm text-muted">Der Upload von Dokumenten wird in einer späteren Version verfügbar sein.</p>
                <button
                  type="button"
                  onClick={handleDocumentsContinue}
                  className="mt-3 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
                >
                  Weiter
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => handleDocumentsChoice(true)} className={toggleButtonClass(false)}>
                  Ja
                </button>
                <button type="button" onClick={() => handleDocumentsChoice(false)} className={toggleButtonClass(false)}>
                  Nein, überspringen
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setPhase('measurements');
                persist(buildSnapshot({ phase: 'measurements' }));
              }}
              className="self-start text-sm font-medium text-muted hover:text-ink"
            >
              ← Zurück
            </button>
          </div>
        ) : null}

        {phase === 'questionnaire' && currentStep ? (
          <div className="mt-6 flex flex-col gap-5">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.15em] text-brand-deep">{currentStep.sectionTitle}</p>
              {currentStep.type === 'question' ? (
                <>
                  <p className="mt-1 text-xs text-muted">
                    Frage {currentStep.questionNumber} von {FAMILY_HISTORY_QUESTION_COUNT}
                  </p>
                  <h3 className="mt-3 text-lg font-medium text-ink">{currentStep.question.label}</h3>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted">Zusätzliche Angaben (optional)</p>
                  <h3 className="mt-3 text-lg font-medium text-ink">
                    Betroffene Person, Erkrankungsalter oder weitere Bemerkungen zu diesem Abschnitt?
                  </h3>
                </>
              )}
            </div>

            {currentStep.type === 'question' ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => answerAndAdvance(currentStep.question.key, true)}
                  className="flex-1 rounded-2xl border border-line bg-card py-4 text-base font-semibold text-ink transition hover:border-brand hover:bg-brand-pale hover:text-brand-deep"
                >
                  Ja
                </button>
                <button
                  type="button"
                  onClick={() => answerAndAdvance(currentStep.question.key, false)}
                  className="flex-1 rounded-2xl border border-line bg-card py-4 text-base font-semibold text-ink transition hover:border-brand hover:bg-brand-pale hover:text-brand-deep"
                >
                  Nein
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <textarea
                  value={sectionNotes[currentStep.sectionKey] ?? ''}
                  onChange={(e) => handleSectionNoteChange(currentStep.sectionKey, e.target.value)}
                  placeholder="Optional…"
                  rows={4}
                  className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-surface"
                />
                <button
                  type="button"
                  onClick={() => goToStep(qIndex + 1)}
                  className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
                >
                  Weiter
                </button>
              </div>
            )}

            <button type="button" onClick={() => goToStep(qIndex - 1)} className="self-start text-sm font-medium text-muted hover:text-ink">
              ← Zurück
            </button>
          </div>
        ) : null}

        {phase === 'summary' ? (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-ink">
              Fast geschafft. {heightCm} cm, {weightKg} kg, {yesCount} von {FAMILY_HISTORY_QUESTION_COUNT} Fragen mit &quot;Ja&quot;
              beantwortet.
            </p>
            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              {isSaving ? 'Speichere…' : 'Check abschließen'}
            </button>
            <button
              type="button"
              onClick={() => goToStep(FLAT_STEPS.length - 1)}
              className="self-start text-sm font-medium text-muted hover:text-ink"
            >
              ← Zurück zum Fragebogen
            </button>
          </div>
        ) : null}

        {phase === 'done' ? (
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-sm text-ink">Dein Ganz-Körper Check wurde gespeichert.</p>
            <button
              type="button"
              onClick={handleDoneClose}
              className="self-start rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
            >
              Schließen
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
