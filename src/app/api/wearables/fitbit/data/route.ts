import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

const API_BASE = 'https://health.googleapis.com/v4';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REFRESH_MARGIN_MS = 60_000;
// https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints
// Order drives display order in the UI -- sleep and vitals (heart rate,
// weight) first, activity last (see WearablesOverview.tsx).
const DATA_TYPES = ['sleep', 'dailyRestingHeartRate', 'weight', 'steps'] as const;
const LOOKBACK_DAYS = 7;

type ConnectionRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

async function getValidAccessToken(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('wearable_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('provider', 'fitbit')
    .maybeSingle();
  if (error || !data) {
    return null;
  }

  const connection = data as ConnectionRow;
  if (new Date(connection.expires_at).getTime() - REFRESH_MARGIN_MS > Date.now()) {
    return connection.access_token;
  }

  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return null;
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!response.ok) {
    console.error('Google Health token refresh failed', { userId, status: response.status });
    return null;
  }

  // Google's refresh response usually omits refresh_token (the original
  // stays valid) -- keep the existing one unless a new one is issued.
  const payload = (await response.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  const expiresAt = new Date(Date.now() + payload.expires_in * 1000).toISOString();

  await supabase
    .from('wearable_connections')
    .update({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token ?? connection.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'fitbit');

  return payload.access_token;
}

/**
 * Latest data point per tracked type for the signed-in user's connected
 * Google Health (Fitbit) account, for the last 7 days.
 *
 * Google's docs (see developers.google.com/health/reference/rest) document
 * the dataTypes/dataPoints endpoint shape and the filter syntax used below,
 * but not the exact per-type payload fields inside each dataPoint -- rather
 * than guess field names that might be wrong, this returns each type's
 * point count plus the raw latest dataPoint object, and the UI renders it
 * generically (see WearablesOverview.tsx). Tighten this once you've seen a
 * real response and know the field names to pull out.
 */
export async function GET(request: Request) {
  const supabase = getSupabaseServerClient();
  const userId = await getAuthenticatedUserId(request, supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });
  }

  const accessToken = await getValidAccessToken(supabase, userId);
  if (!accessToken) {
    return NextResponse.json({ connected: false });
  }

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const responses = await Promise.all(
      DATA_TYPES.map((dataType) => {
        const url = new URL(`${API_BASE}/users/me/dataTypes/${dataType}/dataPoints`);
        url.searchParams.set('filter', `${dataType}.interval.start_time >= "${since}"`);
        url.searchParams.set('pageSize', '100');
        return fetch(url, { headers: authHeaders });
      }),
    );

    if (responses.some((res) => res.status === 401)) {
      return NextResponse.json({ connected: true, expired: true, error: 'Zugriff abgelaufen. Bitte erneut verbinden.' });
    }

    // A non-ok, non-401 response (e.g. 403 for a data type the granted
    // scopes don't cover, or 400 for a bad filter) previously looked
    // identical to "no data" in the UI -- capture the actual error per type
    // instead so a real API problem doesn't masquerade as an empty result.
    const bodies = await Promise.all(
      responses.map(async (res) => {
        if (res.ok) {
          return { ok: true as const, data: (await res.json()) as { dataPoints?: unknown[] } };
        }
        const text = await res.text().catch(() => '');
        return { ok: false as const, status: res.status, text: text.slice(0, 300) };
      }),
    );

    const metrics: Record<string, { count: number; latest: unknown } | { error: string } | null> = {};
    DATA_TYPES.forEach((dataType, index) => {
      const body = bodies[index];
      if (!body.ok) {
        console.error('Google Health dataPoints request failed', { userId, dataType, status: body.status, body: body.text });
        metrics[dataType] = { error: `Fehler ${body.status}` };
        return;
      }

      const points = body.data.dataPoints ?? [];
      if (points.length === 0) {
        metrics[dataType] = null;
        return;
      }
      const rawLatest = points[points.length - 1];
      // Each dataPoint wraps the actual value under a key matching the data
      // type name (e.g. { dataSource: {...}, sleep: {...} }) alongside
      // dataSource metadata we don't need to show -- unwrap it so the UI
      // renders the value itself instead of that wrapper.
      const latest =
        rawLatest && typeof rawLatest === 'object' && dataType in (rawLatest as Record<string, unknown>)
          ? (rawLatest as Record<string, unknown>)[dataType]
          : rawLatest;
      metrics[dataType] = { count: points.length, latest };
    });

    return NextResponse.json({ connected: true, metrics });
  } catch (error) {
    console.error('Google Health data fetch failed', { userId, message: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ connected: true, error: 'Daten konnten nicht geladen werden.' }, { status: 502 });
  }
}
