import { TabNav } from '@/app/components/TabNav';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getServerSessionUser } from '@/app/lib/supabaseServerAuth';
import { getTabsWithData } from '@/core/queries/getTabsWithData';

// Which tabs have data depends on the live DB and the signed-in user --
// render per request instead of prerendering.
export const dynamic = 'force-dynamic';

export default async function DiagnostikLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getServerSessionUser();
  // proxy.ts already gates this route behind login; without a session there's
  // nothing to show, and the page itself redirects to /login.
  const visibleTabs = sessionUser
    ? await getTabsWithData(getSupabaseServerClient(), sessionUser.id)
    : [];

  return (
    <>
      <TabNav visibleTabs={visibleTabs} />
      {children}
    </>
  );
}
