import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRouteHandlerUser } from '@/app/lib/routeHandlerAuth';
import { getSupabaseServerClient } from '@/app/lib/supabaseServer';
import { STATE_COOKIE } from '../shared';

const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
};

function redirectToDaten(request: Request, status: 'connected' | 'error', errorCode?: string) {
  const target = new URL('/datenbank/daten', request.url);
  target.searchParams.set('whoop', status);
  if (errorCode) {
    target.searchParams.set('whoop_error', errorCode);
  }
  return NextResponse.redirect(target);
}

/** Whoop redirects the user's browser here after they approve/deny access. */
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

  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return redirectToDaten(request, 'error', 'not_configured');
  }

  const redirectUri = new URL('/api/wearables/whoop/callback', request.url).toString();

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
    console.error('Whoop token exchange request failed', { userId: user.id, error });
    return redirectToDaten(request, 'error', 'token_request_failed');
  }

  if (!tokenResponse.ok) {
    console.error('Whoop token exchange failed', { userId: user.id, status: tokenResponse.status, body: await tokenResponse.text() });
    return redirectToDaten(request, 'error', 'token_exchange_failed');
  }

  const tokenPayload = (await tokenResponse.json()) as TokenResponse;
  const expiresAt = new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString();

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from('wearable_connections').upsert(
    {
      user_id: user.id,
      provider: 'whoop',
      access_token: tokenPayload.access_token,
      refresh_token: tokenPayload.refresh_token,
      expires_at: expiresAt,
      scope: tokenPayload.scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' },
  );

  if (error) {
    console.error('wearable_connections upsert failed (whoop)', { userId: user.id, message: error.message });
    return redirectToDaten(request, 'error', 'save_failed');
  }

  return redirectToDaten(request, 'connected');
}
