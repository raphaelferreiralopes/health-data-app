// Shared between connect/route.ts and callback/route.ts. Kept out of the
// route files themselves -- Next.js route handlers only allow exporting
// HTTP method handlers and a small set of documented config values, so an
// arbitrary constant export from route.ts fails the build.
export const STATE_COOKIE = 'whoop_oauth_state';
