import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tab } from '../types';

/**
 * Returns the tabs for which the user has at least one recorded lab result.
 * Mirrors the filtering in getTabOverview but stops at existence instead of
 * building the full category/subcategory/parameter tree.
 */
export async function getTabsWithData(supabase: SupabaseClient, userId: string): Promise<Tab[]> {
  const { data: resultRows, error: resultError } = await supabase
    .from('lab_results')
    .select('parameter_id')
    .eq('user_id', userId);
  if (resultError) throw resultError;

  const parameterIds = [...new Set((resultRows ?? []).map((r) => r.parameter_id))];
  if (parameterIds.length === 0) return [];

  const { data: parameterRows, error: parameterError } = await supabase
    .from('lab_parameters')
    .select('subcategory_id')
    .in('id', parameterIds);
  if (parameterError) throw parameterError;

  const subcategoryIds = [...new Set((parameterRows ?? []).map((p) => p.subcategory_id))];
  if (subcategoryIds.length === 0) return [];

  const { data: subcategoryRows, error: subcategoryError } = await supabase
    .from('lab_subcategories')
    .select('category_id')
    .in('id', subcategoryIds);
  if (subcategoryError) throw subcategoryError;

  const categoryIds = [...new Set((subcategoryRows ?? []).map((s) => s.category_id))];
  if (categoryIds.length === 0) return [];

  const { data: categoryRows, error: categoryError } = await supabase
    .from('lab_categories')
    .select('tab')
    .in('id', categoryIds);
  if (categoryError) throw categoryError;

  return [...new Set((categoryRows ?? []).map((c) => c.tab as Tab))];
}
