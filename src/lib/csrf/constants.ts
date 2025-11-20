export const CSRF_COOKIE_PRIMARY = '__Host-stevi-csrf';
export const CSRF_COOKIE_FALLBACK = 'stevi-csrf';
export const CSRF_FIELD_NAME = 'csrf_token';
export const CSRF_ERROR_MESSAGE = 'For your safety, refresh the page and try again.';
export const TOKEN_LENGTH_BYTES = 32;

export type CsrfCookieOptions = {
  httpOnly: true;
  sameSite: 'strict' | 'lax';
  secure: boolean;
  path: '/';
};

export function buildCsrfCookieOptions(isSecure: boolean): CsrfCookieOptions {
  return {
    httpOnly: true as const,
    // Strict is safe for first-party forms; fallback to lax if future cross-site flows appear.
    sameSite: 'strict',
    secure: isSecure,
    path: '/',
  };
}
