import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CategoryOverview,
  Gender,
  LabCategory,
  LabParameter,
  LabReferenceRange,
  LabResult,
  LabSubcategory,
  ParameterWithResult,
  SubcategoryOverview,
  Tab,
} from '../types';
import { computeStatus, pickApplicableRange } from '../referenceRange';

interface FetchTabOverviewArgs {
  supabase: SupabaseClient;
  tab: Tab;
  userId: string;
  gender: Gender;
  age: number;
}

/**
 * Loads the full category → subcategory → parameter tree for a tab, joins
 * each parameter with the user's most recent result, and drops any
 * parameter the user has no entry for. Only the latest measurement per
 * parameter is used — lab_results already supports history, this just
 * doesn't surface it yet (see types.ts).
 */
export async function getTabOverview({
  supabase,
  tab,
  userId,
  gender,
  age,
}: FetchTabOverviewArgs): Promise<CategoryOverview[]> {
  const { data: categoryRows, error: categoryError } = await supabase
    .from('lab_categories')
    .select('id, name, tab, sort_order')
    .eq('tab', tab)
    .order('sort_order');
  if (categoryError) throw categoryError;

  const categories: LabCategory[] = (categoryRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    tab: c.tab,
    sortOrder: c.sort_order,
  }));
  if (categories.length === 0) return [];

  const categoryIds = categories.map((c) => c.id);

  const { data: subcategoryRows, error: subcategoryError } = await supabase
    .from('lab_subcategories')
    .select('id, category_id, name, sort_order')
    .in('category_id', categoryIds)
    .order('sort_order');
  if (subcategoryError) throw subcategoryError;

  const subcategories: LabSubcategory[] = (subcategoryRows ?? []).map((s) => ({
    id: s.id,
    categoryId: s.category_id,
    name: s.name,
    sortOrder: s.sort_order,
  }));
  const subcategoryIds = subcategories.map((s) => s.id);
  if (subcategoryIds.length === 0) return categories.map((category) => ({ category, subcategories: [] }));

  const { data: parameterRows, error: parameterError } = await supabase
    .from('lab_parameters')
    .select(
      'id, subcategory_id, name, abbreviation, unit, description_level1, description_level2, description_level3, learn_more_url, result_type, sort_order',
    )
    .in('subcategory_id', subcategoryIds)
    .order('sort_order');
  if (parameterError) throw parameterError;

  const parameters: LabParameter[] = (parameterRows ?? []).map((p) => ({
    id: p.id,
    subcategoryId: p.subcategory_id,
    name: p.name,
    abbreviation: p.abbreviation,
    unit: p.unit,
    descriptionLevel1: p.description_level1,
    descriptionLevel2: p.description_level2,
    descriptionLevel3: p.description_level3,
    learnMoreUrl: p.learn_more_url,
    resultType: p.result_type,
    sortOrder: p.sort_order,
  }));
  const parameterIds = parameters.map((p) => p.id);
  if (parameterIds.length === 0) return categories.map((category) => ({ category, subcategories: [] }));

  const [{ data: rangeRows, error: rangeError }, { data: resultRows, error: resultError }] = await Promise.all([
    supabase
      .from('lab_reference_ranges')
      .select('id, parameter_id, min, max, qualitative_normal, gender, age_min, age_max')
      .in('parameter_id', parameterIds),
    supabase
      .from('lab_results')
      .select('id, user_id, parameter_id, value, value_qualitative, measured_at, source_document_id')
      .eq('user_id', userId)
      .in('parameter_id', parameterIds)
      .order('measured_at', { ascending: false }),
  ]);
  if (rangeError) throw rangeError;
  if (resultError) throw resultError;

  const ranges: LabReferenceRange[] = (rangeRows ?? []).map((r) => ({
    id: r.id,
    parameterId: r.parameter_id,
    min: r.min,
    max: r.max,
    qualitativeNormal: r.qualitative_normal,
    gender: r.gender,
    ageMin: r.age_min,
    ageMax: r.age_max,
  }));

  // Results are ordered newest-first; keep only the first (= latest) row per parameter.
  const latestResultByParameter = new Map<string, LabResult>();
  for (const r of resultRows ?? []) {
    if (latestResultByParameter.has(r.parameter_id)) continue;
    latestResultByParameter.set(r.parameter_id, {
      id: r.id,
      userId: r.user_id,
      parameterId: r.parameter_id,
      value: r.value,
      valueQualitative: r.value_qualitative,
      measuredAt: r.measured_at,
      sourceDocumentId: r.source_document_id,
    });
  }

  const parametersWithResults: ParameterWithResult[] = [];
  for (const parameter of parameters) {
    const result = latestResultByParameter.get(parameter.id);
    if (!result) continue; // only show parameters the user actually has an entry for

    const rangesForParameter = ranges.filter((r) => r.parameterId === parameter.id);
    const applicableRange = pickApplicableRange(rangesForParameter, gender, age);
    parametersWithResults.push({
      parameter,
      result,
      applicableRange,
      status: computeStatus(result, applicableRange),
    });
  }

  const subcategoryOverviews: SubcategoryOverview[] = subcategories
    .map((subcategory) => ({
      subcategory,
      parameters: parametersWithResults.filter((pw) => pw.parameter.subcategoryId === subcategory.id),
    }))
    .filter((s) => s.parameters.length > 0);

  return categories
    .map((category) => ({
      category,
      subcategories: subcategoryOverviews.filter((s) => s.subcategory.categoryId === category.id),
    }))
    .filter((c) => c.subcategories.length > 0);
}
