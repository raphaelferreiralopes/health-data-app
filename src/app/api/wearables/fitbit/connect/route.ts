import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getRouteHandlerUser } from '@/app/lib/routeHandlerAuth';
import { STATE_COOKIE } from '../shared';

// Google Health API (Fitbit successor) uses Google's standard OAuth2, not a
// Fitbit-specific endpoint. https://developers.google.com/health/setup
const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
// Keep in sync with the data types fetched in ../data/route.ts: steps needs
// activity_and_fitness, weight/dailyRestingHeartRate need
// health_metrics_and_measurements, sleep needs sleep. See
// developers.google.com/health/scopes for the full scope list.
const SCOPE = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly',
  'https://www.googleapis.com/auth/googlehealth.sleep.readonly',
].join(' ');

/** Kicks off the Google Health (Fitbit) OAuth flow -- reached via a plain link, not fetch(). */
export async function GET(request: Request) {
  const user = await getRouteHandlerUser();
  if (!user) {
    return NextResponse.redirect(new URL('/login?next=/datenbank/daten', request.url));
  }

  const clientId = process.env.GOOGLE_HEALTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/datenbank/daten?fitbit=error&fitbit_error=not_configured', request.url));
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

  const redirectUri = new URL('/api/wearables/fitbit/callback', request.url).toString();
  const authorizeUrl = new URL(AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', SCOPE);
  authorizeUrl.searchParams.set('state', state);
  // Both are required to reliably get a refresh_token back from Google --
  // without prompt=consent, a user who already granted access once won't be
  // shown the consent screen again, and Google only issues a refresh_token
  // on that screen.
  authorizeUrl.searchParams.set('access_type', 'offline');
  authorizeUrl.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(authorizeUrl);
}
