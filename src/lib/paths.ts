/**
 * Remove Next.js route group segments (e.g. /(client) or /(workspace)) so matching works
 * against the user-facing pathname.
 */
export function stripRouteGroups(pathname: string): string {
  if (!pathname) return pathname;
  const cleaned = pathname.replace(/\/\([^/]+\)/g, '') || '/';
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

/**
 * Normalize path values coming from Next.js request headers.
 * The `next-url` header may contain either a relative path or an absolute URL.
 * This helper always returns a safe, route-group-free relative path plus pathname for navigation checks.
 */
export function normalizePathFromHeader(
  raw: string | null | undefined,
  fallback = '/',
): { pathname: string; path: string } {
  if (!raw) {
    return { pathname: fallback, path: fallback };
  }

  const format = (pathname: string, search: string) => {
    const cleanedPathname = stripRouteGroups(pathname || fallback);
    const path = `${cleanedPathname}${search}` || fallback;
    return { pathname: cleanedPathname || fallback, path };
  };

  try {
    const url = raw.startsWith('http://') || raw.startsWith('https://') ? new URL(raw) : new URL(raw, 'http://localhost');
    const pathname = url.pathname || fallback;
    const search = url.search || '';
    return format(pathname, search);
  } catch {
    if (raw.startsWith('/')) {
      const [pathname, ...rest] = raw.split('?');
      const search = rest.length ? `?${rest.join('?')}` : '';
      return format(pathname || '/', search);
    }

    return { pathname: fallback, path: fallback };
  }
}
