export function cleanPathname(pathname: string | null | undefined): string {
  const cleaned = (pathname ?? '').split('?')[0];
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    return cleaned.replace(/\/+$/, '');
  }
  return cleaned;
}

export function shouldShowOpsInbox(pathname: string | null | undefined, inboxCount: number): boolean {
  return cleanPathname(pathname) === '/ops/today' && inboxCount > 0;
}
