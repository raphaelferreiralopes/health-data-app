'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import { GanzKoerperCheckSheet, type BodyCheckDraft } from '@/app/components/GanzKoerperCheckSheet';
import { StageActions, StageTracker } from '@/app/components/StageTracker';
import type { ProcessStageStatus } from '@/core/processStages';
import type { ProcessType } from '@/app/api/processes/shared';

type ProcessEntry = {
  id: string;
  processType: ProcessType;
  status: ProcessStageStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

const PROCESS_TYPE_ORDER: ProcessType[] = ['grippe', 'ruecken_schmerzen', 'knie_operation'];
const PROCESS_TYPE_INFO: Record<ProcessType, { title: string; description: string }> = {
  grippe: { title: 'Grippe', description: 'Grippe-Verlauf verfolgen: Arztbesuch, Behandlung, Genesung.' },
  ruecken_schmerzen: { title: 'Rückenschmerzen', description: 'Rückenschmerzen-Verlauf verfolgen: Untersuchung, Behandlung, Kontrolle.' },
  knie_operation: { title: 'Knie Operation', description: 'Verlauf der Knie-Operation verfolgen: Termin, OP, Nachsorge.' },
};

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ProcessCard({
  process,
  isSaving,
  onAdvance,
}: {
  process: ProcessEntry;
  isSaving: boolean;
  onAdvance: (process: ProcessEntry, nextStatus: ProcessStageStatus) => void;
}) {
  const info = PROCESS_TYPE_INFO[process.processType];
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-ink">{info.title}</span>
        <span className="text-sm text-muted">{info.description}</span>
        <span className="text-xs text-muted">Gestartet am {formatDate(process.createdAt)}</span>
      </div>

      <StageTracker status={process.status} />
      <StageActions status={process.status} isSaving={isSaving} onAdvance={(nextStatus) => onAdvance(process, nextStatus)} />
    </div>
  );
}

export default function ProzessePage() {
  const router = useRouter();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initialDraft, setInitialDraft] = useState<BodyCheckDraft | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [processes, setProcesses] = useState<ProcessEntry[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [creatingType, setCreatingType] = useState<ProcessType | null>(null);
  const [savingProcessId, setSavingProcessId] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      const client = getBrowserSupabaseClient();
      if (!client) {
        setIsLoading(false);
        return;
      }

      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      setAccessToken(token ?? null);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const [bodyCheckResponse, processesResponse] = await Promise.all([
          fetch('/api/body-checks', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/processes', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const payload = (await bodyCheckResponse.json()) as {
          draft?: BodyCheckDraft | null;
          lastCompleted?: { completedAt: string | null; createdAt: string } | null;
        };
        setInitialDraft(payload.draft ?? null);
        setHasDraft(Boolean(payload.draft));
        setLastCompletedAt(payload.lastCompleted?.completedAt ?? payload.lastCompleted?.createdAt ?? null);

        const processesPayload = (await processesResponse.json()) as { processes?: ProcessEntry[] };
        setProcesses(processesPayload.processes ?? []);
      } catch {
        // card falls back to "Jetzt starten" if the status lookup fails
      } finally {
        setIsLoading(false);
      }
    };

    void loadStatus();
  }, []);

  const startProcess = async (processType: ProcessType) => {
    if (!accessToken) return;
    setIsPickerOpen(false);
    setCreatingType(processType);
    try {
      const response = await fetch('/api/processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ processType }),
      });
      const payload = (await response.json()) as { entry?: ProcessEntry };
      if (response.ok && payload.entry) {
        setProcesses((current) => [payload.entry as ProcessEntry, ...current]);
      }
    } catch {
      // best-effort; user can just try again from the picker
    } finally {
      setCreatingType(null);
    }
  };

  const updateProcessStatus = async (process: ProcessEntry, nextStatus: ProcessStageStatus) => {
    if (!accessToken) return;
    setSavingProcessId(process.id);
    setProcesses((current) => current.map((p) => (p.id === process.id ? { ...p, status: nextStatus } : p)));
    try {
      await fetch(`/api/processes/${process.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      // best-effort autosave -- a failed save just resets on next reload
    } finally {
      setSavingProcessId(null);
    }
  };

  // Once a check is completed (and no draft is waiting to be resumed), the
  // card's own click leads to the recommended-tests overview instead of
  // restarting the wizard -- re-doing the check is still possible from there.
  const showsRecommendedTests = !hasDraft && Boolean(lastCompletedAt);

  const statusLabel = isLoading
    ? 'Lade…'
    : hasDraft
      ? 'Fragebogen unterbrochen – weitermachen'
      : lastCompletedAt
        ? 'Empfohlene Tests ansehen'
        : 'Jetzt starten';

  const handleCardClick = () => {
    if (showsRecommendedTests) {
      router.push('/prozesse/empfohlene-tests');
    } else {
      setIsSheetOpen(true);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-light tracking-tight text-ink">Prozesse</h1>
      <p className="mt-2 text-sm text-muted">Geführte Selbstchecks und Verläufe über Zeit.</p>

      <div className="mt-8 flex flex-col gap-4">
        <button
          type="button"
          onClick={handleCardClick}
          disabled={isLoading}
          className="flex w-full flex-col items-start justify-between gap-2 rounded-2xl border border-line bg-surface p-8 text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60 sm:flex-row sm:items-center sm:gap-6"
        >
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold text-ink">Ganz-Körper Check</span>
            <span className="text-sm text-muted">
              Körpermaße erfassen und die Familienanamnese zum genetischen Risiko Schritt für Schritt ausfüllen.
            </span>
            {lastCompletedAt ? (
              <span className="text-xs text-muted">Zuletzt abgeschlossen am {formatDate(lastCompletedAt)}</span>
            ) : null}
          </div>
          <span className="shrink-0 text-xs font-medium text-brand-deep">{statusLabel}</span>
        </button>
      </div>

      <div className="mt-12">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">Deine Prozesse</h2>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPickerOpen((open) => !open)}
              disabled={!accessToken || creatingType !== null}
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              + Neuen Prozess starten
            </button>
            {isPickerOpen ? (
              <div className="absolute right-0 z-10 mt-2 w-60 rounded-xl border border-line bg-surface p-2 shadow-lg">
                {PROCESS_TYPE_ORDER.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => startProcess(type)}
                    disabled={creatingType !== null}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink transition hover:bg-card disabled:opacity-60"
                  >
                    {PROCESS_TYPE_INFO[type].title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {processes.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Noch keine Prozesse gestartet.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {processes.map((process) => (
              <ProcessCard key={process.id} process={process} isSaving={savingProcessId === process.id} onAdvance={updateProcessStatus} />
            ))}
          </div>
        )}
      </div>

      {!isLoading ? (
        <GanzKoerperCheckSheet
          isOpen={isSheetOpen}
          draft={initialDraft}
          onClose={() => {
            setIsSheetOpen(false);
            if (justCompleted) {
              setJustCompleted(false);
              router.push('/prozesse/empfohlene-tests');
            }
          }}
          onDraftStarted={() => setHasDraft(true)}
          onCompleted={(completedAt) => {
            setHasDraft(false);
            setLastCompletedAt(completedAt);
            setJustCompleted(true);
          }}
        />
      ) : null}
    </main>
  );
}
