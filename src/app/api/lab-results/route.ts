import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { isWithinRateLimit } from '@/app/lib/rateLimit';
import { serverError } from '@/app/lib/apiError';
import { isValidResult, type LabResultInput } from './shared';

// Generous row-count cap (rather than request-count) since a single save can
// legitimately carry a whole PDF's worth of parameters (100+ rows).
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_ROWS = 500;
// Sanity ceiling on a single request, independent of the rolling-window
// check above (which only looks at rows from *before* this request).
const MAX_RESULTS_PER_REQUEST = 1000;

type LabResultsPayload = {
  results?: LabResultInput[];
};

/** Writes user-confirmed lab results, e.g. from the PDF extraction review step. */
export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const withinLimit = await isWithinRateLimit(supabase, {
    table: 'lab_results',
    userId,
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: RATE_LIMIT_MAX_ROWS,
  });
  if (!withinLimit) {
    return NextResponse.json(
      { error: `Zu viele gespeicherte Werte. Bitte versuche es in einer Stunde erneut (max. ${RATE_LIMIT_MAX_ROWS} pro Stunde).` },
      { status: 429 },
    );
  }

  const body = (await request.json()) as LabResultsPayload;
  const results = body.results ?? [];

  if (results.length === 0) {
    return NextResponse.json({ error: 'Keine Werte zum Speichern übergeben.' }, { status: 400 });
  }
  if (results.length > MAX_RESULTS_PER_REQUEST) {
    return NextResponse.json({ error: `Zu viele Werte auf einmal (max. ${MAX_RESULTS_PER_REQUEST}).` }, { status: 400 });
  }
  if (!results.every(isValidResult)) {
    return NextResponse.json({ error: 'Ungültige Werte übergeben.' }, { status: 400 });
  }

  const payload = results.map((r) => ({
    user_id: userId,
    parameter_id: r.parameterId,
    value: r.valueNumeric ?? null,
    value_qualitative: r.valueQualitative ?? null,
    measured_at: r.measuredAt,
  }));

  const { error } = await supabase.from('lab_results').insert(payload);

  if (error) {
    return serverError('lab-results insert failed', error);
  }

  return NextResponse.json({ inserted: payload.length });
}
