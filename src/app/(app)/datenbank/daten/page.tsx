const PLANNED_INTEGRATIONS = [
  { name: 'Whoop', description: 'Schlaf, Erholung (Recovery) und Trainingsbelastung.' },
  { name: 'Google Health Connect', description: 'Schritte, Herzfrequenz und weitere Android-Gesundheitsdaten.' },
  { name: 'Apple Health', description: 'Aktivität, Vitalwerte und Schlafdaten von iPhone und Apple Watch.' },
] as const;

export default function DatenPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <p className="text-sm text-muted">
        Wearable- und Health-App-Daten erscheinen hier automatisch, sobald die jeweilige Anbindung steht.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {PLANNED_INTEGRATIONS.map((integration) => (
          <div
            key={integration.name}
            className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="flex flex-col gap-1">
              <span className="text-base font-semibold text-ink">{integration.name}</span>
              <span className="text-sm text-muted">{integration.description}</span>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted ring-1 ring-inset ring-line">
              Geplant
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
