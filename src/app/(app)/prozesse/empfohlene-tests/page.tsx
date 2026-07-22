'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';
import type { RecommendedTestKey, RecommendedTestPhase, RecommendedTestStatus } from '@/app/api/recommended-tests/shared';
import { StageActions, StageTracker } from '@/app/components/StageTracker';

type RecommendedTestEntry = {
  id: string;
  bodyCheckId: string;
  testKey: RecommendedTestKey;
  phase: RecommendedTestPhase;
  status: RecommendedTestStatus;
};

const TEST_INFO: Record<RecommendedTestKey, { title: string; description: string }> = {
  vitalwerte_arzt: {
    title: 'Vitalwerte beim Arzt',
    description: 'Blutdruck, Puls, Größe und Gewicht beim Hausarzt messen lassen.',
  },
  grosses_blutbild: {
    title: 'Großes Blutbild',
    description: 'Laborüberweisung für ein großes Blutbild einholen und Blut abnehmen lassen.',
  },
  urin_probe: {
    title: 'Urinprobe',
    description: 'Urinprobe beim Arzt abgeben.',
  },
  zahnarzt: {
    title: 'Zahnarzt',
    description: 'Reguläre Zahnkontrolle vereinbaren.',
  },
  augenarzt: {
    title: 'Augenarzt',
    description: 'Sehtest und Augenuntersuchung beim Augenarzt.',
  },
  hno_arzt: {
    title: 'HNO-Arzt',
    description: 'Hals-Nasen-Ohren-Untersuchung beim Facharzt.',
  },
  hautarzt: {
    title: 'Hautarzt',
    description: 'Hautkontrolle beim Dermatologen.',
  },
  allergologe: {
    title: 'Allergologe',
    description: 'Allergietestung beim Allergologen.',
  },
  hautkrebs_screening: {
    title: 'Hautkrebs-Screening',
    description: 'Ganzkörper-Hautkrebsvorsorge beim Hautarzt.',
  },
  darmkrebsvorsorge: {
    title: 'Darmkrebsvorsorge',
    description: 'Darmkrebs-Vorsorgeuntersuchung (z. B. Darmspiegelung) je nach Alter.',
  },
  mammographie_gyn: {
    title: 'Mammographie & gynäkologische Vorsorge',
    description: 'Brustkrebs-Screening und gynäkologische Vorsorgeuntersuchung.',
  },
  prostata_vorsorge: {
    title: 'Prostata-Vorsorge',
    description: 'Prostatakrebs-Vorsorgeuntersuchung beim Urologen.',
  },
};

const PHASE_ORDER: RecommendedTestPhase[] = [1, 2, 3];
const PHASE_INFO: Record<RecommendedTestPhase, { title: string; description: string }> = {
  1: { title: 'Phase 1 · Empfohlene Tests', description: 'Vitalwerte, großes Blutbild und Urinprobe.' },
  2: { title: 'Phase 2 · Facharzttermine', description: 'Zahnarzt, Augenarzt, HNO-Arzt, Hautarzt und Allergologe.' },
  3: { title: 'Phase 3 · Krebsvorsorge', description: 'Vorsorgeuntersuchungen zur Krebsfrüherkennung.' },
};

function isPhaseComplete(phaseTests: RecommendedTestEntry[]): boolean {
  return phaseTests.length > 0 && phaseTests.every((test) => test.status === 'hochgeladen');
}

function TestCard({
  test,
  isSaving,
  onAdvance,
}: {
  test: RecommendedTestEntry;
  isSaving: boolean;
  onAdvance: (test: RecommendedTestEntry, nextStatus: RecommendedTestStatus) => void;
}) {
  const info = TEST_INFO[test.testKey];

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-col gap-1">
        <span className="text-lg font-semibold text-ink">{info.title}</span>
        <span className="text-sm text-muted">{info.description}</span>
      </div>

      <StageTracker status={test.status} />
      <StageActions status={test.status} isSaving={isSaving} onAdvance={(nextStatus) => onAdvance(test, nextStatus)} />
    </div>
  );
}

export default function EmpfohleneTestsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [bodyCheckId, setBodyCheckId] = useState<string | null>(null);
  const [tests, setTests] = useState<RecommendedTestEntry[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const client = getBrowserSupabaseClient();
      if (!client) {
        setIsLoading(false);
        return;
      }

      const { data } = await client.auth.getSession();
      const token = data.session?.access_token ?? null;
      setAccessToken(token);
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/recommended-tests', { headers: { Authorization: `Bearer ${token}` } });
        const payload = (await response.json()) as { bodyCheckId: string | null; tests: RecommendedTestEntry[]; error?: string };
        if (!response.ok) {
          setLoadError(payload.error ?? 'Laden fehlgeschlagen.');
          return;
        }
        setBodyCheckId(payload.bodyCheckId);
        setTests(payload.tests);
      } catch {
        setLoadError('Laden fehlgeschlagen.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const updateStatus = async (test: RecommendedTestEntry, nextStatus: RecommendedTestStatus) => {
    if (!accessToken) return;
    setSavingId(test.id);
    setTests((current) => current.map((t) => (t.id === test.id ? { ...t, status: nextStatus } : t)));
    try {
      await fetch(`/api/recommended-tests/${test.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      // best-effort; a failed save just means the stage resets on next reload
    } finally {
      setSavingId(null);
    }
  };

  const testsByPhase: Record<RecommendedTestPhase, RecommendedTestEntry[]> = {
    1: tests.filter((t) => t.phase === 1),
    2: tests.filter((t) => t.phase === 2),
    3: tests.filter((t) => t.phase === 3),
  };
  const phase1Done = isPhaseComplete(testsByPhase[1]);
  const phase2Done = isPhaseComplete(testsByPhase[2]);
  const phaseUnlocked: Record<RecommendedTestPhase, boolean> = { 1: true, 2: phase1Done, 3: phase1Done && phase2Done };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/prozesse" className="text-sm font-medium text-muted hover:text-ink">
        ← Zurück zu Prozesse
      </Link>
      <h1 className="mt-2 text-2xl font-light tracking-tight text-ink">Empfohlene Tests</h1>
      <p className="mt-2 text-sm text-muted">
        Basierend auf deinem Ganz-Körper Check empfehlen wir dir einen dreistufigen Vorsorge-Fahrplan. Halte den Fortschritt hier fest.
      </p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted">Lade…</p>
      ) : loadError ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-8">
          <p className="text-sm text-red-600">{loadError}</p>
        </div>
      ) : !bodyCheckId ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-8">
          <p className="text-sm text-ink">Schließe zuerst den Ganz-Körper Check ab, um deine empfohlenen Tests zu sehen.</p>
          <Link
            href="/prozesse"
            className="mt-4 inline-block rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-deep"
          >
            Zu Prozesse
          </Link>
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {PHASE_ORDER.map((phase) => {
            const phaseInfo = PHASE_INFO[phase];
            const phaseTests = testsByPhase[phase];
            const unlocked = phaseUnlocked[phase];

            return (
              <div key={phase}>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-semibold text-ink">{phaseInfo.title}</h2>
                  <p className="text-sm text-muted">{phaseInfo.description}</p>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                  {unlocked ? (
                    phaseTests.map((test) => <TestCard key={test.id} test={test} isSaving={savingId === test.id} onAdvance={updateStatus} />)
                  ) : (
                    <div className="rounded-2xl border border-dashed border-line bg-card p-6">
                      <p className="text-sm text-muted">
                        Wird freigeschaltet, sobald {phase === 2 ? 'Phase 1' : 'Phase 2'} vollständig hochgeladen ist.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
