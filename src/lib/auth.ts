export type NextParam = string | string[] | undefined;
export type AuthErrorCode = 'google_auth_cancelled' | 'google_auth_error';

export function resolveNextPath(raw: NextParam, fallback = '/home'): string {
  if (!raw) {
    return fallback;
  }

  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate) {
    return fallback;
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  return candidate;
}

export function parseAuthErrorCode(raw: NextParam): AuthErrorCode | null {
  if (!raw) {
    return null;
  }

  const value = Array.isArray(raw) ? raw[0] : raw;

  if (value === 'google_auth_cancelled' || value === 'google_auth_error') {
    return value;
  }

  return null;
}
