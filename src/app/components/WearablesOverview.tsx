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

type FitbitData = {
  connected: boolean;
  expired?: boolean;
  error?: string;
  metrics?: Record<string, { count: number; latest: unknown } | null>;
};

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

function DataSection({ title, isExpired, loadError, children }: { title: string; isExpired?: boolean; loadError?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {isExpired ? (
        <p className="mt-3 text-sm text-red-600">Zugriff abgelaufen -- bitte oben erneut verbinden.</p>
      ) : loadError ? (
        <p className="mt-3 text-sm text-red-600">{loadError}</p>
      ) : (
        <div className="mt-4">{children}</div>
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
              <div className="mt-2 flex flex-col gap-4">
                {isWhoopConnected ? (
                  <DataSection title="Whoop" isExpired={whoop?.expired} loadError={whoop?.error}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl bg-card p-3">
                        <p className="text-xs text-muted">Recovery</p>
                        <p className="mt-1 text-lg font-semibold text-ink">
                          {whoop?.recovery?.scorePercent != null ? `${whoop.recovery.scorePercent}%` : '–'}
                        </p>
                        <p className="text-xs text-muted">
                          Ruhepuls: {whoop?.recovery?.restingHeartRate ?? '–'} · {formatDateTime(whoop?.recovery?.date)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-card p-3">
                        <p className="text-xs text-muted">Schlaf</p>
                        <p className="mt-1 text-lg font-semibold text-ink">
                          {whoop?.sleep?.performancePercent != null ? `${whoop.sleep.performancePercent}%` : '–'}
                        </p>
                        <p className="text-xs text-muted">
                          {formatDuration(whoop?.sleep?.inBedMilli)} · {formatDateTime(whoop?.sleep?.date)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-card p-3">
                        <p className="text-xs text-muted">Strain</p>
                        <p className="mt-1 text-lg font-semibold text-ink">
                          {whoop?.strain?.score != null ? whoop.strain.score.toFixed(1) : '–'}
                        </p>
                        <p className="text-xs text-muted">
                          Ø-Puls: {whoop?.strain?.averageHeartRate ?? '–'} · {formatDateTime(whoop?.strain?.date)}
                        </p>
                      </div>
                    </div>
                  </DataSection>
                ) : null}

                {isFitbitConnected ? (
                  <DataSection title="Fitbit" isExpired={fitbit?.expired} loadError={fitbit?.error}>
                    <div className="flex flex-col gap-5">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">
                          Schlaf {fitbit?.metrics?.sleep ? `· ${fitbit.metrics.sleep.count} Datenpunkte, letzte 7 Tage` : ''}
                        </p>
                        <div className="mt-2 rounded-xl bg-card p-3">
                          {fitbit?.metrics?.sleep ? <KeyValueTree value={fitbit.metrics.sleep.latest} /> : <span className="text-sm text-muted">–</span>}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">Vitalwerte</p>
                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="rounded-xl bg-card p-3">
                            <p className="text-xs text-muted">
                              Ruhepuls {fitbit?.metrics?.dailyRestingHeartRate ? `· ${fitbit.metrics.dailyRestingHeartRate.count} Datenpunkte` : ''}
                            </p>
                            <div className="mt-1">
                              {fitbit?.metrics?.dailyRestingHeartRate ? (
                                <KeyValueTree value={fitbit.metrics.dailyRestingHeartRate.latest} />
                              ) : (
                                <span className="text-sm text-muted">–</span>
                              )}
                            </div>
                          </div>
                          <div className="rounded-xl bg-card p-3">
                            <p className="text-xs text-muted">Gewicht {fitbit?.metrics?.weight ? `· ${fitbit.metrics.weight.count} Datenpunkte` : ''}</p>
                            <div className="mt-1">
                              {fitbit?.metrics?.weight ? <KeyValueTree value={fitbit.metrics.weight.latest} /> : <span className="text-sm text-muted">–</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted">
                          Aktivität {fitbit?.metrics?.steps ? `· ${fitbit.metrics.steps.count} Datenpunkte, letzte 7 Tage` : ''}
                        </p>
                        <div className="mt-2 rounded-xl bg-card p-3">
                          {fitbit?.metrics?.steps ? <KeyValueTree value={fitbit.metrics.steps.latest} /> : <span className="text-sm text-muted">–</span>}
                        </div>
                      </div>
                    </div>
                  </DataSection>
                ) : null}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
