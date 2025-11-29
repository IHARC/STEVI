/**
 * Normalize path values coming from Next.js request headers.
 * The `next-url` header may contain either a relative path or an absolute URL.
 * This helper always returns a safe, relative path plus pathname for workspace checks.
 */
export function normalizePathFromHeader(
  raw: string | null | undefined,
  fallback = '/',
): { pathname: string; path: string } {
  if (!raw) {
    return { pathname: fallback, path: fallback };
  }

  try {
    const url = raw.startsWith('http://') || raw.startsWith('https://') ? new URL(raw) : new URL(raw, 'http://localhost');
    const pathname = url.pathname || fallback;
    const search = url.search || '';
    const path = `${pathname}${search}` || fallback;
    return { pathname, path };
  } catch {
    if (raw.startsWith('/')) {
      const [pathname, ...rest] = raw.split('?');
      const search = rest.length ? `?${rest.join('?')}` : '';
      const path = `${pathname || '/'}${search}` || fallback;
      return { pathname: pathname || '/', path };
    }

    return { pathname: fallback, path: fallback };
  }
}
