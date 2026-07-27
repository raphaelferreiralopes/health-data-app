import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRouteHandlerUser } from '@/app/lib/routeHandlerAuth';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { STATE_COOKIE } from '../shared';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

function redirectToDaten(request: Request, status: 'connected' | 'error', errorCode?: string) {
  const target = new URL('/datenbank/daten', request.url);
  target.searchParams.set('fitbit', status);
  if (errorCode) {
    target.searchParams.set('fitbit_error', errorCode);
  }
  return NextResponse.redirect(target);
}

/** Google redirects the user's browser here after they approve/deny access. */
export async function GET(request: Request) {
  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const providerError = url.searchParams.get('error');

  if (providerError) {
    return redirectToDaten(request, 'error', providerError);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToDaten(request, 'error', 'invalid_state');
  }

  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_HEALTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectToDaten(request, 'error', 'not_configured');
  }

  const redirectUri = new URL('/api/wearables/fitbit/callback', request.url).toString();

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
  } catch (error) {
    console.error('Google Health token exchange request failed', { userId: user.id, error });
    return redirectToDaten(request, 'error', 'token_request_failed');
  }

  if (!tokenResponse.ok) {
    console.error('Google Health token exchange failed', { userId: user.id, status: tokenResponse.status, body: await tokenResponse.text() });
    return redirectToDaten(request, 'error', 'token_exchange_failed');
  }

  const tokenPayload = (await tokenResponse.json()) as TokenResponse;
  if (!tokenPayload.refresh_token) {
    // Shouldn't happen with access_type=offline&prompt=consent, but without a
    // refresh_token we can't fetch data again once the short-lived access
    // token expires, so treat it as a failed connection rather than storing
    // a connection that goes stale in under an hour.
    console.error('Google Health token exchange returned no refresh_token', { userId: user.id });
    return redirectToDaten(request, 'error', 'no_refresh_token');
  }

  const expiresAt = new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString();

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('wearable_connections').upsert(
    {
      user_id: user.id,
      provider: 'fitbit',
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token,
      expires_at: expiresAt,
      scope: tokenPayload.scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' },
  );

  if (error) {
    console.error('wearable_connections upsert failed (fitbit)', { userId: user.id, message: error.message });
    return redirectToDaten(request, 'error', 'save_failed');
  }

  return redirectToDaten(request, 'connected');
}
