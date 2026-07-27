import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tab } from '../types';

type EmbeddedRow = {
  lab_parameters: {
    lab_subcategories: {
      lab_categories: {
        tab: Tab;
      } | null;
    } | null;
  } | null;
};

/**
 * Returns the tabs for which the user has at least one recorded lab result.
 * Walks the FK chain lab_results -> lab_parameters -> lab_subcategories ->
 * lab_categories via a single embedded PostgREST query instead of four
 * sequential round-trips (one per step, each waiting on the previous one's
 * ids) -- the previous version was the main cause of Diagnostik feeling slow
 * to open.
 */
export async function getTabsWithData(supabase: SupabaseClient, userId: string): Promise<Tab[]> {
  const { data, error } = await supabase
    .from('lab_results')
    .select('lab_parameters(lab_subcategories(lab_categories(tab)))')
    .eq('user_id', userId);
  if (error) throw error;

  const tabs = new Set<Tab>();
  for (const row of (data ?? []) as unknown as EmbeddedRow[]) {
    const tab = row.lab_parameters?.lab_subcategories?.lab_categories?.tab;
    if (tab) tabs.add(tab);
  }

  return [...tabs];
}
