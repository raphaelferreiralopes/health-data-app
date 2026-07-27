// Shared between connect/route.ts and callback/route.ts -- see the sibling
// whoop/shared.ts comment for why this isn't exported from route.ts itself.
// "Fitbit" is the user-facing name; under the hood this connects via the
// Google Health API (Google acquired Fitbit and folded its data into this
// new API -- there is no more separate public Fitbit Web API for new apps).
export const STATE_COOKIE = 'fitbit_oauth_state';
