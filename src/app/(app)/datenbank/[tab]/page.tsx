import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getServerSessionUser } from '@/app/lib/supabaseServerAuth';
import { isTab } from '@/app/lib/tabs';
import { DEMO_USER_ID, DEMO_USER_PROFILE } from '@/core/demoUser';
import { getTabOverview } from '@/core/queries/getTabOverview';
import { TabOverview } from '@/app/components/TabOverview';

// Data depends on the live DB and the signed-in user -- render per request
// instead of prerendering.
export const dynamic = 'force-dynamic';

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!isTab(tab)) notFound();

  const sessionUser = await getServerSessionUser();
  // No profile table yet to source real demographics from, so signed-in
  // users still get the demo gender/age used for reference-range lookup.
  // Their own data (lab_results scoped to their user id) is real either way.
  const userId = sessionUser?.id ?? DEMO_USER_ID;

  const supabase = getSupabaseServerClient();
  const categories = await getTabOverview({
    supabase,
    tab,
    userId,
    gender: DEMO_USER_PROFILE.gender,
    age: DEMO_USER_PROFILE.age,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <TabOverview categories={categories} emptyLabel="Für diesen Bereich sind noch keine Werte erfasst." />
    </main>
  );
}
