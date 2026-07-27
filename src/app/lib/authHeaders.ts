// Shared between proxy.ts (which sets these after verifying the session)
// and supabaseServerAuth.ts (which reads them) -- kept in its own file so
// Server Components reading the headers don't have to import the middleware
// module itself (and its @supabase/ssr / next/server middleware-only bits).
export const USER_ID_HEADER = 'x-user-id';
export const USER_EMAIL_HEADER = 'x-user-email';
