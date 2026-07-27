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

const FITBIT_TYPE_LABELS: Record<string, string> = {
  steps: 'Schritte',
  dailyRestingHeartRate: 'Ruhepuls',
  sleep: 'Schlaf',
  weight: 'Gewicht',
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

/** Best-effort flat rendering of an unknown-shaped API object -- see fitbit/data/route.ts for why the shape isn't hardcoded. */
function RawValuePreview({ value }: { value: unknown }) {
  if (value === null || typeof value !== 'object') {
    return <span className="text-ink">{String(value)}</span>;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {entries.map(([key, val]) => (
        <div key={key} className="contents">
          <dt className="text-muted">{key}</dt>
          <dd className="truncate text-ink">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</dd>
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {Object.entries(fitbit?.metrics ?? {}).map(([type, entry]) => (
                        <div key={type} className="rounded-xl bg-card p-3">
                          <p className="text-xs text-muted">
                            {FITBIT_TYPE_LABELS[type] ?? type} {entry ? `(${entry.count} Datenpunkte, letzte 7 Tage)` : ''}
                          </p>
                          {entry ? (
                            <div className="mt-1">
                              <RawValuePreview value={entry.latest} />
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-ink">–</p>
                          )}
                        </div>
                      ))}
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
