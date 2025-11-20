export const CSRF_COOKIE_NAME = '__Host-stevi-csrf';
export const CSRF_FIELD_NAME = 'csrf_token';
export const CSRF_ERROR_MESSAGE = 'For your safety, refresh the page and try again.';
export const TOKEN_LENGTH_BYTES = 32;

export const CSRF_COOKIE_OPTIONS = {
  httpOnly: true as const,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV !== 'development',
  path: '/',
};
