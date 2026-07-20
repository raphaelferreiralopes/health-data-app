import type { SupabaseClient } from '@supabase/supabase-js';
import type { Gender, LabReferenceRange, ParameterWithResult } from '../types';
import { computeStatus, pickApplicableRange } from '../referenceRange';

interface FetchParameterDetailArgs {
  supabase: SupabaseClient;
  parameterId: string;
  userId: string;
  gender: Gender;
  age: number;
}

/** Same shape as an entry from getTabOverview, fetched standalone for a detail view/deep link. */
export async function getParameterDetail({
  supabase,
  parameterId,
  userId,
  gender,
  age,
}: FetchParameterDetailArgs): Promise<ParameterWithResult | null> {
  const { data: parameterRow, error: parameterError } = await supabase
    .from('lab_parameters')
    .select('id, subcategory_id, name, unit, description_short, learn_more_url, result_type, sort_order')
    .eq('id', parameterId)
    .maybeSingle();
  if (parameterError) throw parameterError;
  if (!parameterRow) return null;

  const [{ data: rangeRows, error: rangeError }, { data: resultRows, error: resultError }] = await Promise.all([
    supabase
      .from('lab_reference_ranges')
      .select('id, parameter_id, min, max, qualitative_normal, gender, age_min, age_max')
      .eq('parameter_id', parameterId),
    supabase
      .from('lab_results')
      .select('id, user_id, parameter_id, value, value_qualitative, measured_at, source_document_id')
      .eq('user_id', userId)
      .eq('parameter_id', parameterId)
      .order('measured_at', { ascending: false })
      .limit(1),
  ]);
  if (rangeError) throw rangeError;
  if (resultError) throw resultError;

  const resultRow = resultRows?.[0];
  if (!resultRow) return null; // no entry for this user -> nothing to show

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

  const result = {
    id: resultRow.id,
    userId: resultRow.user_id,
    parameterId: resultRow.parameter_id,
    value: resultRow.value,
    valueQualitative: resultRow.value_qualitative,
    measuredAt: resultRow.measured_at,
    sourceDocumentId: resultRow.source_document_id,
  };

  const applicableRange = pickApplicableRange(ranges, gender, age);

  return {
    parameter: {
      id: parameterRow.id,
      subcategoryId: parameterRow.subcategory_id,
      name: parameterRow.name,
      unit: parameterRow.unit,
      descriptionShort: parameterRow.description_short,
      learnMoreUrl: parameterRow.learn_more_url,
      resultType: parameterRow.result_type,
      sortOrder: parameterRow.sort_order,
    },
    result,
    applicableRange,
    status: computeStatus(result, applicableRange),
  };
}
