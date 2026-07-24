import { notFound, redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getServerSessionUser } from '@/app/lib/supabaseServerAuth';
import { isTab } from '@/app/lib/tabs';
import { DEFAULT_PROFILE } from '@/core/demoUser';
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
  // proxy.ts already gates this route behind login, so this is only a
  // defense-in-depth fallback -- never show another identity's data here.
  if (!sessionUser) {
    redirect('/login');
  }

  const supabase = getSupabaseServerClient();

  // Signed-in users without a completed profile yet (see AuthGate) fall
  // back to a default gender/age until they fill one in.
  let gender = DEFAULT_PROFILE.gender;
  let age = DEFAULT_PROFILE.age;
  const { data: profile } = await supabase
    .from('profiles')
    .select('gender, date_of_birth')
    .eq('user_id', sessionUser.id)
    .maybeSingle();
  if (profile) {
    gender = profile.gender;
    age = computeAge(profile.date_of_birth);
  }

  const categories = await getTabOverview({
    supabase,
    tab,
    userId: sessionUser.id,
    gender,
    age,
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <TabOverview categories={categories} emptyLabel="Für diesen Bereich sind noch keine Werte erfasst." />
    </main>
  );
}
