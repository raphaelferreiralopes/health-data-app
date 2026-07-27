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
 *
 * All five tables are fetched in parallel rather than as a sequential
 * categories -> subcategories -> parameters -> (ranges + results) chain --
 * the catalog tables (subcategories/parameters/ranges) are small shared
 * reference data, and a user's lab_results history is small too, so fetching
 * each in full and filtering/joining in JS costs a bit of extra payload but
 * turns 3-4 sequential round-trips into one round-trip's worth of latency.
 */
export async function getTabOverview({
  supabase,
  tab,
  userId,
  gender,
  age,
}: FetchTabOverviewArgs): Promise<CategoryOverview[]> {
  const [
    { data: categoryRows, error: categoryError },
    { data: subcategoryRows, error: subcategoryError },
    { data: parameterRows, error: parameterError },
    { data: rangeRows, error: rangeError },
    { data: resultRows, error: resultError },
  ] = await Promise.all([
    supabase.from('lab_categories').select('id, name, tab, sort_order').eq('tab', tab).order('sort_order'),
    supabase.from('lab_subcategories').select('id, category_id, name, sort_order').order('sort_order'),
    supabase
      .from('lab_parameters')
      .select(
        'id, subcategory_id, name, abbreviation, unit, description_level1, description_level2, description_level3, learn_more_url, result_type, sort_order',
      )
      .order('sort_order'),
    supabase.from('lab_reference_ranges').select('id, parameter_id, min, max, qualitative_normal, gender, age_min, age_max'),
    supabase
      .from('lab_results')
      .select('id, user_id, parameter_id, value, value_qualitative, measured_at, source_document_id')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false }),
  ]);
  if (categoryError) throw categoryError;
  if (subcategoryError) throw subcategoryError;
  if (parameterError) throw parameterError;
  if (rangeError) throw rangeError;
  if (resultError) throw resultError;

  const categories: LabCategory[] = (categoryRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    tab: c.tab,
    sortOrder: c.sort_order,
  }));
  if (categories.length === 0) return [];
  const categoryIds = new Set(categories.map((c) => c.id));

  const subcategories: LabSubcategory[] = (subcategoryRows ?? [])
    .filter((s) => categoryIds.has(s.category_id))
    .map((s) => ({
      id: s.id,
      categoryId: s.category_id,
      name: s.name,
      sortOrder: s.sort_order,
    }));
  const subcategoryIds = new Set(subcategories.map((s) => s.id));
  if (subcategoryIds.size === 0) return categories.map((category) => ({ category, subcategories: [] }));

  const parameters: LabParameter[] = (parameterRows ?? [])
    .filter((p) => subcategoryIds.has(p.subcategory_id))
    .map((p) => ({
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
  if (parameters.length === 0) return categories.map((category) => ({ category, subcategories: [] }));
  const parameterIds = new Set(parameters.map((p) => p.id));

  const ranges: LabReferenceRange[] = (rangeRows ?? [])
    .filter((r) => parameterIds.has(r.parameter_id))
    .map((r) => ({
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
    if (!parameterIds.has(r.parameter_id)) continue;
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
