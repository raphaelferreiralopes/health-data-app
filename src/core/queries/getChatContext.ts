import type { SupabaseClient } from '@supabase/supabase-js';
import type { Gender, Tab } from '../types';
import { getTabOverview } from './getTabOverview';
import { formatReferenceRange } from '../referenceRange';

const TABS: Tab[] = ['blutanalyse', 'urin', 'stuhl', 'allergie'];
const TAB_LABELS: Record<Tab, string> = {
  blutanalyse: 'Blutanalyse',
  urin: 'Urin',
  stuhl: 'Stuhl',
  allergie: 'Allergie',
};

const FREQUENCY_LABELS: Record<string, string> = {
  taeglich: 'täglich',
  wochentage: 'an bestimmten Wochentagen',
  intervall: 'im Intervall',
  nach_bedarf: 'bei Bedarf',
};

// Explanation levels can be long (see arztbefund_uploads.explanation_level2);
// truncate per document so a handful of uploads can't blow the context budget.
const MAX_EXPLANATION_CHARS = 1200;

type MedicationRow = {
  name: string;
  description: string | null;
  category: 'medikament' | 'supplement';
  frequency_type: string;
  times_per_day: number;
};

type ArztbefundRow = {
  title: string;
  explanation_level2: string;
  created_at: string;
};

/**
 * Builds a compact German text summary of everything the app knows about a
 * user -- lab results, medications, and AI explanations of uploaded
 * Arztbefunde -- for use as Gemini system-instruction context in the chat
 * feature. Reuses the same joins/status logic as the Diagnostik tabs
 * (getTabOverview/referenceRange) rather than re-querying raw tables.
 */
export async function buildChatContext({
  supabase,
  userId,
  gender,
  age,
}: {
  supabase: SupabaseClient;
  userId: string;
  gender: Gender;
  age: number;
}): Promise<string> {
  const sections: string[] = [
    `Nutzerprofil: Alter ${age}, Geschlecht ${gender === 'm' ? 'männlich' : gender === 'f' ? 'weiblich' : 'unbekannt'}.`,
  ];

  for (const tab of TABS) {
    const categories = await getTabOverview({ supabase, tab, userId, gender, age });
    const lines: string[] = [];
    for (const category of categories) {
      for (const subcategory of category.subcategories) {
        for (const pw of subcategory.parameters) {
          const label = pw.parameter.abbreviation ? `${pw.parameter.name} (${pw.parameter.abbreviation})` : pw.parameter.name;
          const value =
            pw.parameter.resultType === 'qualitative'
              ? pw.result.valueQualitative ?? '–'
              : `${pw.result.value ?? '–'}${pw.parameter.unit ? ` ${pw.parameter.unit}` : ''}`;
          const statusLabel =
            pw.status === 'in_range' ? 'im Normbereich' : pw.status === 'out_of_range' ? 'AUSSERHALB des Normbereichs' : 'Status unbekannt';
          lines.push(
            `- ${label}: ${value} (Referenz: ${formatReferenceRange(pw.applicableRange, pw.parameter.unit)}) — ${statusLabel}, gemessen am ${pw.result.measuredAt}`,
          );
        }
      }
    }
    if (lines.length > 0) {
      sections.push(`### Laborwerte -- ${TAB_LABELS[tab]}\n${lines.join('\n')}`);
    }
  }

  const { data: medicationRows } = await supabase
    .from('medications')
    .select('name, description, category, frequency_type, times_per_day')
    .eq('user_id', userId)
    .eq('active', true);

  const medications = (medicationRows ?? []) as MedicationRow[];
  if (medications.length > 0) {
    const lines = medications.map((m) => {
      const kind = m.category === 'supplement' ? 'Supplement' : 'Medikament';
      const frequency = FREQUENCY_LABELS[m.frequency_type] ?? m.frequency_type;
      const timesPerDay = m.times_per_day > 1 ? `, ${m.times_per_day}x pro Tag` : '';
      const description = m.description ? ` -- ${m.description}` : '';
      return `- ${m.name} (${kind}, ${frequency}${timesPerDay})${description}`;
    });
    sections.push(`### Aktuelle Medikamente & Supplements\n${lines.join('\n')}`);
  }

  const { data: arztbefundRows } = await supabase
    .from('arztbefund_uploads')
    .select('title, explanation_level2, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const arztbefunde = (arztbefundRows ?? []) as ArztbefundRow[];
  if (arztbefunde.length > 0) {
    const lines = arztbefunde.map((a) => {
      const date = a.created_at.slice(0, 10);
      const explanation = a.explanation_level2.slice(0, MAX_EXPLANATION_CHARS);
      return `- "${a.title}" (hochgeladen am ${date}): ${explanation}`;
    });
    sections.push(`### Hochgeladene Arztbefunde (KI-Erklärung)\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}
