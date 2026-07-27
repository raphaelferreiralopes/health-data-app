'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getBrowserSupabaseClient } from '@/app/lib/supabaseBrowser';

type WhoopData = {
  connected: boolean;
  expired?: boolean;
  error?: string;
  recovery?: { scorePercent: number | null; hrvMilli: number | null; restingHeartRate: number | null; date: string | null } | null;
  sleep?: { performancePercent: number | null; inBedMilli: number | null; date: string | null } | null;
  strain?: { score: number | null; averageHeartRate: number | null; date: string | null } | null;
  bodyMeasurement?: { heightMeter: number | null; weightKilogram: number | null; maxHeartRate: number | null } | null;
};

type FitbitMetricEntry = { count: number; latest: unknown } | { error: string } | null;

type FitbitData = {
  connected: boolean;
  expired?: boolean;
  error?: string;
  metrics?: Record<string, FitbitMetricEntry>;
};

type DataTab = 'schlaf' | 'vitalwerte' | 'aktivitaet';

const DATA_TABS: { key: DataTab; label: string }[] = [
  { key: 'schlaf', label: 'Schlaf' },
  { key: 'vitalwerte', label: 'Vitalwerte' },
  { key: 'aktivitaet', label: 'Aktivität' },
];

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return '–';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}min`;
}

function formatPrimitive(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return formatDateTime(value);
  }
  if (value === null || value === undefined || value === '') {
    return '–';
  }
  return String(value);
}

/** "startTime"/"endTime" ISO pairs (Google Health's "interval" objects) collapse to one readable line instead of expanding into a deep date/time breakdown. */
function formatIntervalValue(value: Record<string, unknown>): string | null {
  const start = value.startTime;
  const end = value.endTime;
  if (typeof start !== 'string' || typeof end !== 'string') return null;

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  const sameDay = startDate.toDateString() === endDate.toDateString();
  const endLabel = sameDay ? endDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : formatDateTime(end);
  return `${formatDateTime(start)} – ${endLabel}`;
}

/**
 * Recursively renders an unknown-shaped API object as an indented
 * key/value tree instead of a raw JSON dump -- see fitbit/data/route.ts for
 * why the exact shape isn't hardcoded into named fields.
 */
function KeyValueTree({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return <span className="text-sm text-muted">–</span>;
  }
  if (typeof value !== 'object') {
    return <span className="text-sm text-ink">{formatPrimitive(value)}</span>;
  }

  const interval = !Array.isArray(value) ? formatIntervalValue(value as Record<string, unknown>) : null;
  if (interval) {
    return <span className="text-sm text-ink">{interval}</span>;
  }

  const entries = Array.isArray(value) ? value.map((v, i) => [String(i), v] as const) : Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return <span className="text-sm text-muted">–</span>;
  }

  return (
    <dl className={`flex flex-col gap-1.5 ${depth > 0 ? 'ml-3 border-l border-line pl-3' : ''}`}>
      {entries.map(([key, val]) => (
        <div key={key}>
          <dt className="text-xs text-muted">{key}</dt>
          <dd className="mt-0.5">
            {val !== null && typeof val === 'object' ? <KeyValueTree value={val} depth={depth + 1} /> : <span className="text-sm text-ink">{formatPrimitive(val)}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const SLEEP_STAGE_ORDER = ['AWAKE', 'LIGHT', 'REM', 'DEEP'] as const;
type SleepStageType = (typeof SLEEP_STAGE_ORDER)[number];
const SLEEP_STAGE_SET = new Set<string>(SLEEP_STAGE_ORDER);
// Ordinal depth ramp in the app's brand hue -- light -> dark reads as
// "less restful -> more restful", matching how Apple Health/Oura/Whoop
// conventionally shade sleep stages. Wach sits outside the ramp (neutral
// gray, not a depth level). brand-pale (#e8f1fc) was tried for "Leicht"
// first but measured 1.05:1 against the card surface -- functionally
// invisible; #6ba9ea is a computed mid-step of the same blue hue that
// clears 2:1 and keeps the ramp monotone (validated with the dataviz
// skill's palette validator, --ordinal mode).
const SLEEP_STAGE_LABELS: Record<SleepStageType, string> = { AWAKE: 'Wach', LIGHT: 'Leicht', REM: 'REM', DEEP: 'Tief' };
const SLEEP_STAGE_BAR_CLASS: Record<SleepStageType, string> = { AWAKE: 'bg-line', LIGHT: 'bg-[#6ba9ea]', REM: 'bg-brand', DEEP: 'bg-brand-deep' };

type SleepStageSummary = { type: SleepStageType; durationMs: number };
type SleepSummary = { asleepMs: number; startIso: string | null; endIso: string | null; stages: SleepStageSummary[] };

function readInterval(value: Record<string, unknown>): { start: unknown; end: unknown } {
  const nested = value.interval && typeof value.interval === 'object' ? (value.interval as Record<string, unknown>) : value;
  return { start: nested.startTime, end: nested.endTime };
}

/** Parses a Google Health "sleep" dataPoint into stage totals for SleepStagesCard; returns null if the shape doesn't match (falls back to the generic tree). */
function parseSleepSummary(latest: unknown): SleepSummary | null {
  if (!latest || typeof latest !== 'object') return null;
  const obj = latest as Record<string, unknown>;

  const { start: topStart, end: topEnd } = readInterval(obj);
  const startIso = typeof topStart === 'string' ? topStart : null;
  const endIso = typeof topEnd === 'string' ? topEnd : null;

  const stagesRaw = Array.isArray(obj.stages) ? obj.stages : [];
  const durationByType = new Map<SleepStageType, number>();

  for (const raw of stagesRaw) {
    if (!raw || typeof raw !== 'object') continue;
    const stageObj = raw as Record<string, unknown>;
    const type = typeof stageObj.type === 'string' ? stageObj.type.toUpperCase() : null;
    if (!type || !SLEEP_STAGE_SET.has(type)) continue;

    const { start, end } = readInterval(stageObj);
    if (typeof start !== 'string' || typeof end !== 'string') continue;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) continue;

    const key = type as SleepStageType;
    durationByType.set(key, (durationByType.get(key) ?? 0) + (endMs - startMs));
  }

  if (durationByType.size === 0) return null;

  const stages = SLEEP_STAGE_ORDER.filter((type) => durationByType.has(type)).map((type) => ({
    type,
    durationMs: durationByType.get(type) as number,
  }));
  const asleepMs = stages.filter((s) => s.type !== 'AWAKE').reduce((sum, s) => sum + s.durationMs, 0);

  return { asleepMs, startIso, endIso, stages };
}

/** Stacked composition bar of sleep stages -- see fitbit/data/route.ts for the raw shape and dataviz skill for the mark spec (2px surface gaps, ordinal ramp, legend + direct labels). */
function SleepStagesCard({ latest }: { latest: unknown }) {
  const summary = parseSleepSummary(latest);
  if (!summary) {
    return <KeyValueTree value={latest} />;
  }

  const totalStageMs = summary.stages.reduce((sum, s) => sum + s.durationMs, 0);
  const endLabel =
    summary.endIso && summary.startIso && new Date(summary.startIso).toDateString() === new Date(summary.endIso).toDateString()
      ? new Date(summary.endIso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : formatDateTime(summary.endIso);

  return (
    <div>
      <p className="text-2xl font-semibold text-ink">{formatDuration(summary.asleepMs)}</p>
      <p className="text-xs text-muted">
        geschlafen · {formatDateTime(summary.startIso)} – {endLabel}
      </p>

      <div className="mt-3 flex h-5 w-full gap-0.5 overflow-hidden rounded-full bg-card">
        {summary.stages.map((stage) => (
          <div
            key={stage.type}
            className={SLEEP_STAGE_BAR_CLASS[stage.type]}
            style={{ width: `${(stage.durationMs / totalStageMs) * 100}%` }}
            title={`${SLEEP_STAGE_LABELS[stage.type]}: ${formatDuration(stage.durationMs)}`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {summary.stages.map((stage) => (
          <div key={stage.type} className="flex items-center gap-1.5 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${SLEEP_STAGE_BAR_CLASS[stage.type]}`} />
            <span className="text-muted">{SLEEP_STAGE_LABELS[stage.type]}</span>
            <span className="font-medium text-ink">{formatDuration(stage.durationMs)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricTile({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-card p-3">
      <p className="text-xs text-muted">
        {label}
        {sublabel ? ` · ${sublabel}` : ''}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** Renders a Fitbit metric entry, distinguishing a real API error from a genuinely empty result. */
function FitbitMetricTile({ label, entry }: { label: string; entry: FitbitMetricEntry }) {
  if (entry && 'error' in entry) {
    return (
      <MetricTile label={label}>
        <span className="text-sm text-red-600">{entry.error}</span>
      </MetricTile>
    );
  }
  return (
    <MetricTile label={label} sublabel={entry ? `${entry.count} Datenpunkte, letzte 7 Tage` : undefined}>
      {entry ? <KeyValueTree value={entry.latest} /> : <span className="text-sm text-muted">Keine Daten</span>}
    </MetricTile>
  );
}

function ConnectionBanner({ status, errorCode, providerLabel }: { status: string | null; errorCode: string | null; providerLabel: string }) {
  if (!status) return null;
  if (status === 'connected') {
    return <p className="rounded-xl bg-brand-pale px-4 py-2.5 text-sm text-brand-deep">{providerLabel} erfolgreich verbunden.</p>;
  }
  return (
    <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
      Verbindung mit {providerLabel} fehlgeschlagen{errorCode ? ` (${errorCode})` : ''}.
    </p>
  );
}

function ConnectionRow({
  title,
  description,
  connectHref,
  isLoading,
  isConnected,
  planned,
  onDisconnect,
}: {
  title: string;
  description: string;
  connectHref?: string;
  isLoading?: boolean;
  isConnected?: boolean;
  planned?: boolean;
  onDisconnect?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      {planned ? (
        <span className="shrink-0 inline-flex items-center rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-inset ring-line">
          Geplant
        </span>
      ) : isLoading ? null : isConnected ? (
        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-brand-pale px-2.5 py-1 text-xs font-medium text-brand-deep">Verbunden</span>
          <button type="button" onClick={onDisconnect} className="text-sm font-medium text-muted hover:text-red-600">
            Trennen
          </button>
        </div>
      ) : (
        <a href={connectHref} className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-deep">
          Verbinden
        </a>
      )}
    </div>
  );
}

export function WearablesOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [whoop, setWhoop] = useState<WhoopData | null>(null);
  const [fitbit, setFitbit] = useState<FitbitData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataTab, setDataTab] = useState<DataTab>('schlaf');

  const whoopStatus = searchParams.get('whoop');
  const whoopErrorCode = searchParams.get('whoop_error');
  const fitbitStatus = searchParams.get('fitbit');
  const fitbitErrorCode = searchParams.get('fitbit_error');

  useEffect(() => {
    if (whoopStatus || fitbitStatus) {
      const url = new URL(window.location.href);
      ['whoop', 'whoop_error', 'fitbit', 'fitbit_error'].forEach((key) => url.searchParams.delete(key));
      router.replace(url.pathname, { scroll: false });
    }
  }, [whoopStatus, fitbitStatus, router]);

  const loadData = async (token: string) => {
    const [whoopRes, fitbitRes] = await Promise.all([
      fetch('/api/wearables/whoop/data', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
      fetch('/api/wearables/fitbit/data', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
    ]);
    setWhoop(whoopRes && whoopRes.ok ? ((await whoopRes.json()) as WhoopData) : { connected: false });
    setFitbit(fitbitRes && fitbitRes.ok ? ((await fitbitRes.json()) as FitbitData) : { connected: false });
  };

  useEffect(() => {
    const init = async () => {
      const client = getBrowserSupabaseClient();
      if (!client) {
        setIsLoading(false);
        return;
      }
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token ?? null;
      setAccessToken(token);
      if (token) {
        await loadData(token);
      }
      setIsLoading(false);
    };
    void init();
  }, [whoopStatus, fitbitStatus]);

  const disconnect = async (provider: 'whoop' | 'fitbit') => {
    if (!accessToken) return;
    try {
      await fetch(`/api/wearables/${provider}/disconnect`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } });
    } catch {
      // best-effort; row falls back to "not connected" once we re-fetch below
    }
    await loadData(accessToken);
  };

  const isWhoopConnected = Boolean(whoop?.connected);
  const isFitbitConnected = Boolean(fitbit?.connected);
  const hasAnyConnection = isWhoopConnected || isFitbitConnected;
  const hasLoadIssue = (isWhoopConnected && (whoop?.expired || whoop?.error)) || (isFitbitConnected && (fitbit?.expired || fitbit?.error));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <p className="text-sm text-muted">Verbinde deine Wearables, damit ihre Daten hier automatisch erscheinen.</p>

      <div className="mt-4 flex flex-col gap-2">
        <ConnectionBanner status={whoopStatus} errorCode={whoopErrorCode} providerLabel="Whoop" />
        <ConnectionBanner status={fitbitStatus} errorCode={fitbitErrorCode} providerLabel="Fitbit" />
      </div>

      {!isLoading && !accessToken ? (
        <p className="mt-6 text-sm text-muted">Melde dich an, um Wearables zu verbinden.</p>
      ) : (
        <>
          <section className="mt-6">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Verbindungen</h2>
            <div className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface px-6">
              <ConnectionRow title="Whoop" description="Schlaf, Erholung (Recovery) und Trainingsbelastung." planned />
              <ConnectionRow
                title="Fitbit"
                description="Schritte, Ruhepuls, Schlaf und Gewicht (über die Google Health API)."
                connectHref="/api/wearables/fitbit/connect"
                isLoading={isLoading}
                isConnected={isFitbitConnected}
                onDisconnect={() => disconnect('fitbit')}
              />
              <ConnectionRow title="Apple Health" description="Aktivität, Vitalwerte und Schlafdaten von iPhone und Apple Watch." planned />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted">Deine Daten</h2>

            {!isLoading && !hasAnyConnection ? (
              <p className="mt-4 text-sm text-muted">Noch keine Wearables verbunden. Verbinde eins oben, um hier Daten zu sehen.</p>
            ) : (
              <div className="mt-2 rounded-2xl border border-line bg-surface p-6">
                <div className="inline-flex rounded-lg bg-card p-1" role="tablist" aria-label="Datenkategorie">
                  {DATA_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={dataTab === tab.key}
                      onClick={() => setDataTab(tab.key)}
                      className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        dataTab === tab.key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {hasLoadIssue ? (
                  <p className="mt-4 text-sm text-red-600">
                    {whoop?.expired || fitbit?.expired ? 'Zugriff für eine Verbindung abgelaufen -- bitte oben erneut verbinden.' : whoop?.error ?? fitbit?.error}
                  </p>
                ) : null}

                <div className="mt-4">
                  {dataTab === 'schlaf' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {isWhoopConnected ? (
                        <MetricTile label="Whoop" sublabel={formatDateTime(whoop?.sleep?.date)}>
                          <p className="text-lg font-semibold text-ink">
                            {whoop?.sleep?.performancePercent != null ? `${whoop.sleep.performancePercent}%` : '–'}
                          </p>
                          <p className="text-xs text-muted">{formatDuration(whoop?.sleep?.inBedMilli)} im Bett</p>
                        </MetricTile>
                      ) : null}
                      {isFitbitConnected ? (
                        (() => {
                          const entry = fitbit?.metrics?.sleep ?? null;
                          if (entry && 'error' in entry) {
                            return (
                              <MetricTile label="Fitbit">
                                <span className="text-sm text-red-600">{entry.error}</span>
                              </MetricTile>
                            );
                          }
                          return (
                            <MetricTile label="Fitbit" sublabel={entry ? `${entry.count} Datenpunkte, letzte 7 Tage` : undefined}>
                              {entry ? <SleepStagesCard latest={entry.latest} /> : <span className="text-sm text-muted">Keine Daten</span>}
                            </MetricTile>
                          );
                        })()
                      ) : null}
                    </div>
                  ) : null}

                  {dataTab === 'vitalwerte' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {isWhoopConnected ? (
                        <>
                          <MetricTile label="Whoop Recovery" sublabel={formatDateTime(whoop?.recovery?.date)}>
                            <p className="text-lg font-semibold text-ink">
                              {whoop?.recovery?.scorePercent != null ? `${whoop.recovery.scorePercent}%` : '–'}
                            </p>
                            <p className="text-xs text-muted">Ruhepuls: {whoop?.recovery?.restingHeartRate ?? '–'}</p>
                          </MetricTile>
                          <MetricTile label="Whoop Body">
                            <p className="text-sm text-ink">
                              {whoop?.bodyMeasurement?.weightKilogram != null ? `${whoop.bodyMeasurement.weightKilogram} kg` : '–'}
                            </p>
                            <p className="text-xs text-muted">Max-Puls: {whoop?.bodyMeasurement?.maxHeartRate ?? '–'}</p>
                          </MetricTile>
                        </>
                      ) : null}
                      {isFitbitConnected ? (
                        <>
                          <FitbitMetricTile label="Fitbit Ruhepuls" entry={fitbit?.metrics?.dailyRestingHeartRate ?? null} />
                          <FitbitMetricTile label="Fitbit Gewicht" entry={fitbit?.metrics?.weight ?? null} />
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  {dataTab === 'aktivitaet' ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {isWhoopConnected ? (
                        <MetricTile label="Whoop Strain" sublabel={formatDateTime(whoop?.strain?.date)}>
                          <p className="text-lg font-semibold text-ink">{whoop?.strain?.score != null ? whoop.strain.score.toFixed(1) : '–'}</p>
                          <p className="text-xs text-muted">Ø-Puls: {whoop?.strain?.averageHeartRate ?? '–'}</p>
                        </MetricTile>
                      ) : null}
                      {isFitbitConnected ? <FitbitMetricTile label="Fitbit Schritte" entry={fitbit?.metrics?.steps ?? null} /> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
