import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { isTab } from '@/app/lib/tabs';
import { DEMO_USER_ID, DEMO_USER_PROFILE } from '@/core/demoUser';
import { getTabOverview } from '@/core/queries/getTabOverview';
import { TabOverview } from '@/app/components/TabOverview';

// Data depends on the live DB and isn't known at build time (no auth yet
// to key a static cache on) -- render per request instead of prerendering.
export const dynamic = 'force-dynamic';

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!isTab(tab)) notFound();

  const supabase = getSupabaseServerClient();
  const categories = await getTabOverview({
    supabase,
    tab,
    userId: DEMO_USER_ID,
    gender: DEMO_USER_PROFILE.gender,
    age: DEMO_USER_PROFILE.age,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <TabOverview categories={categories} emptyLabel="Für diesen Bereich sind noch keine Werte erfasst." />
    </main>
  );
}
