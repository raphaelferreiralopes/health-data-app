import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAuthenticatedUserId } from '@/app/lib/apiAuth';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';

const API_BASE = 'https://api.prod.whoop.com/developer';
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
// Refresh a bit before actual expiry so a request never races an
// already-expired token.
const REFRESH_MARGIN_MS = 60_000;

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
    .eq('provider', 'whoop')
    .maybeSingle();
  if (error || !data) {
    return null;
  }

  const connection = data as ConnectionRow;
  if (new Date(connection.expires_at).getTime() - REFRESH_MARGIN_MS > Date.now()) {
    return connection.access_token;
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
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
      scope: 'offline',
    }),
  });
  if (!response.ok) {
    console.error('Whoop token refresh failed', { userId, status: response.status });
    return null;
  }

  const payload = (await response.json()) as { access_token: string; refresh_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + payload.expires_in * 1000).toISOString();

  await supabase
    .from('wearable_connections')
    .update({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('provider', 'whoop');

  return payload.access_token;
}

/**
 * Latest recovery/sleep/strain/body-measurement snapshot for the signed-in
 * user's connected Whoop account.
 *
 * The field names read off each response below (score.recovery_score,
 * score.stage_summary.total_in_bed_time_milli, etc.) follow Whoop's
 * documented v2 response schema, but weren't verified against a live
 * response -- double-check against a real payload once WHOOP_CLIENT_ID/
 * SECRET are configured, and adjust the mapping below if any field is off.
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

  try {
    const [recoveryRes, sleepRes, cycleRes, bodyRes] = await Promise.all([
      fetch(`${API_BASE}/v2/recovery?limit=1`, { headers: authHeaders }),
      fetch(`${API_BASE}/v2/activity/sleep?limit=1`, { headers: authHeaders }),
      fetch(`${API_BASE}/v2/cycle?limit=1`, { headers: authHeaders }),
      fetch(`${API_BASE}/v2/user/measurement/body`, { headers: authHeaders }),
    ]);

    if ([recoveryRes, sleepRes, cycleRes, bodyRes].some((res) => res.status === 401)) {
      return NextResponse.json({ connected: true, expired: true, error: 'Whoop-Zugriff abgelaufen. Bitte erneut verbinden.' });
    }

    const [recovery, sleep, cycle, body] = await Promise.all([
      recoveryRes.ok ? recoveryRes.json() : null,
      sleepRes.ok ? sleepRes.json() : null,
      cycleRes.ok ? cycleRes.json() : null,
      bodyRes.ok ? bodyRes.json() : null,
    ]);

    const latestRecovery = recovery?.records?.[0] ?? null;
    const latestSleep = sleep?.records?.[0] ?? null;
    const latestCycle = cycle?.records?.[0] ?? null;

    return NextResponse.json({
      connected: true,
      recovery: latestRecovery
        ? {
            scorePercent: latestRecovery.score?.recovery_score ?? null,
            hrvMilli: latestRecovery.score?.hrv_rmssd_milli ?? null,
            restingHeartRate: latestRecovery.score?.resting_heart_rate ?? null,
            date: latestRecovery.created_at ?? null,
          }
        : null,
      sleep: latestSleep
        ? {
            performancePercent: latestSleep.score?.sleep_performance_percentage ?? null,
            inBedMilli: latestSleep.score?.stage_summary?.total_in_bed_time_milli ?? null,
            date: latestSleep.start ?? null,
          }
        : null,
      strain: latestCycle
        ? {
            score: latestCycle.score?.strain ?? null,
            averageHeartRate: latestCycle.score?.average_heart_rate ?? null,
            date: latestCycle.start ?? null,
          }
        : null,
      bodyMeasurement: body
        ? {
            heightMeter: body.height_meter ?? null,
            weightKilogram: body.weight_kilogram ?? null,
            maxHeartRate: body.max_heart_rate ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('Whoop data fetch failed', { userId, message: error instanceof Error ? error.message : 'unknown' });
    return NextResponse.json({ connected: true, error: 'Whoop-Daten konnten nicht geladen werden.' }, { status: 502 });
  }
}
