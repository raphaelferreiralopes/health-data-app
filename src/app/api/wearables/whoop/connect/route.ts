import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRouteHandlerUser } from '@/app/lib/routeHandlerAuth';
import { STATE_COOKIE } from '../shared';

// https://developer.whoop.com/docs/developing/oauth/
const AUTHORIZE_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
// "offline" is required to receive a refresh_token, not just an access_token.
const SCOPE = 'read:recovery read:cycles read:sleep read:workout read:body_measurement read:profile offline';

/** Kicks off the Whoop OAuth flow -- reached via a plain link, not fetch(). */
export async function GET(request: Request) {
  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/datenbank/daten', request.url));
  }

  const clientId = process.env.WHOOP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/datenbank/daten?whoop=error&whoop_error=not_configured', request.url));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  const redirectUri = new URL('/api/wearables/whoop/callback', request.url).toString();
  const authorizeUrl = new URL(AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', SCOPE);
  authorizeUrl.searchParams.set('state', state);

  return NextResponse.redirect(authorizeUrl);
}
