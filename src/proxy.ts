import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { USER_EMAIL_HEADER, USER_ID_HEADER } from '@/app/lib/authHeaders';

// Reachable without a session. /datenschutz stays reachable for signed-in
// users too (unlike /login, which redirects them straight into the app) --
// see the two separate checks below.
const PUBLIC_PATHS = ['/login', '/datenschutz'];
const LOGGED_OUT_ONLY_PATHS = ['/login'];

// Index routes with no content of their own (see datenbank/page.tsx and
// datenbank/diagnostik/page.tsx) -- redirected here at the edge so the
// in-between layout (which queries the DB for the tab nav) never renders at
// all. A page-level redirect() still runs its enclosing layout once before
// bouncing to the real target, so without this a single click used to run
// that layout's queries twice.
const INDEX_REDIRECTS: Record<string, string> = {
  '/datenbank': '/datenbank/diagnostik/blutanalyse',
  '/datenbank/diagnostik': '/datenbank/diagnostik/blutanalyse',
};

// Downstream Server Components (see supabaseServerAuth.ts) read the
// already-verified user from USER_ID_HEADER/USER_EMAIL_HEADER instead of
// calling supabase.auth.getUser() again -- that call is a real network
// round-trip to Supabase's auth server, and doing it a second (or third)
// time per navigation for a check this middleware just did is pure latency
// for no extra safety: the middleware already gates the route.

/**
 * Refreshes the Supabase session cookie on every request (Server Components
 * can't write cookies) and gates every app route behind login: signed-out
 * visitors are sent to /login, and a signed-in visitor hitting /login is
 * sent straight into the app.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.next({ request });
  }

  // Collected from setAll (only fires when the session was refreshed) and
  // applied once at the end, alongside the auth-result request headers --
  // avoids the previous pattern of rebuilding the whole NextResponse mid-flight.
  let refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];
  let cookieResponseHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        refreshedCookies = cookiesToSet;
        cookieResponseHeaders = headers;
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && LOGGED_OUT_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  const indexRedirect = INDEX_REDIRECTS[pathname];
  if (indexRedirect) {
    return NextResponse.redirect(new URL(indexRedirect, request.url));
  }

  const requestHeaders = new Headers(request.headers);
  if (user) {
    requestHeaders.set(USER_ID_HEADER, user.id);
    requestHeaders.set(USER_EMAIL_HEADER, user.email ?? '');
  } else {
    requestHeaders.delete(USER_ID_HEADER);
    requestHeaders.delete(USER_EMAIL_HEADER);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  refreshedCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  Object.entries(cookieResponseHeaders).forEach(([key, value]) => response.headers.set(key, value));

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
