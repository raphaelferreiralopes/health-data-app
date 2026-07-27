import { Suspense } from 'react';
import { WearablesOverview } from '@/app/components/WearablesOverview';

export default function DatenPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <p className="text-sm text-muted">Lade…</p>
        </main>
      }
    >
      <WearablesOverview />
    </Suspense>
  );
}
