import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getServerSessionUser } from '@/app/lib/supabaseServerAuth';
import { isTab } from '@/app/lib/tabs';
import { DEMO_USER_ID, DEMO_USER_PROFILE } from '@/core/demoUser';
import { computeAge } from '@/core/age';
import { getTabOverview } from '@/core/queries/getTabOverview';
import { TabOverview } from '@/app/components/TabOverview';

// Data depends on the live DB and the signed-in user -- render per request
// instead of prerendering.
export const dynamic = 'force-dynamic';

export default async function TabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  if (!isTab(tab)) notFound();

  const sessionUser = await getServerSessionUser();
  const userId = sessionUser?.id ?? DEMO_USER_ID;

  const supabase = getSupabaseServerClient();

  // Signed-in users without a completed profile yet (see AuthGate) fall
  // back to the demo gender/age, same as anonymous visitors -- only their
  // own lab_results are real either way.
  let gender = DEMO_USER_PROFILE.gender;
  let age = DEMO_USER_PROFILE.age;
  if (sessionUser) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('gender, date_of_birth')
      .eq('user_id', sessionUser.id)
      .maybeSingle();
    if (profile) {
      gender = profile.gender;
      age = computeAge(profile.date_of_birth);
    }
  }

  const categories = await getTabOverview({
    supabase,
    tab,
    userId,
    gender,
    age,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <TabOverview categories={categories} emptyLabel="Für diesen Bereich sind noch keine Werte erfasst." />
    </main>
  );
}
