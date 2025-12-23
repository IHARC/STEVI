const DEFAULT_APP_URL = 'https://stevi.iharc.ca';
const DEFAULT_LOGIN_URL = 'https://login.iharc.ca';

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_APP_URL;
}

export function getLoginUrl(): string {
  return process.env.NEXT_PUBLIC_LOGIN_URL ?? DEFAULT_LOGIN_URL;
}

export function getHostFromHeaders(headerList: Headers): string | null {
  const forwardedHost = headerList.get('x-forwarded-host');
  if (forwardedHost) {
    return forwardedHost.split(',')[0]?.trim() ?? null;
  }

  const host = headerList.get('host');
  return host?.trim() ?? null;
}

export function isLoginHost(hostname: string | null | undefined): boolean {
  if (!hostname) {
    return false;
  }

  const loginHost = getLoginHost();
  const normalized = hostname.toLowerCase().split(':')[0] ?? hostname.toLowerCase();
  return normalized === loginHost;
}

export function getLoginHost(): string {
  try {
    return new URL(getLoginUrl()).host.toLowerCase();
  } catch {
    return new URL(DEFAULT_LOGIN_URL).host.toLowerCase();
  }
}

export function getAppHost(): string {
  try {
    return new URL(getAppUrl()).host.toLowerCase();
  } catch {
    return new URL(DEFAULT_APP_URL).host.toLowerCase();
  }
}

export function buildAbsoluteUrl(baseUrl: string, path: string): string {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}
