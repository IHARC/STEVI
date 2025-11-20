const CSRF_COOKIE_SECURE = process.env.NODE_ENV !== 'development';

// __Host- prefix requires Secure+Path=/; browsers drop it on http:// localhost.
// Use a non-__Host name for local dev so the cookie is accepted and CSRF checks pass.
export const CSRF_COOKIE_NAME = CSRF_COOKIE_SECURE ? '__Host-stevi-csrf' : 'stevi-csrf';
export const CSRF_FIELD_NAME = 'csrf_token';
export const CSRF_ERROR_MESSAGE = 'For your safety, refresh the page and try again.';
export const TOKEN_LENGTH_BYTES = 32;

export const CSRF_COOKIE_OPTIONS = {
  httpOnly: true as const,
  sameSite: 'strict' as const,
  secure: CSRF_COOKIE_SECURE,
  path: '/',
};

export { CSRF_COOKIE_SECURE };
