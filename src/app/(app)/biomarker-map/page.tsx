import { BodyOrganMap } from '@/app/components/BodyOrganMap';

export default function BiomarkerMapPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-brand-deep">BioMarker Map</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Wähle ein Organ</h1>
        <p className="mt-2 text-sm text-muted">Tippe auf ein Organ in der Abbildung oder in der Liste, um seine BioMarker zu sehen.</p>
      </div>

      <div className="mt-10">
        <BodyOrganMap />
      </div>
    </main>
  );
}
