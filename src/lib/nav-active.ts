import type { NavItem } from '@/lib/nav-types';

type SearchParamsLike = { get: (key: string) => string | null } | null | undefined;

export function isNavItemActive(item: Pick<NavItem, 'href' | 'match' | 'exact' | 'query'>, pathname: string, searchParams?: SearchParamsLike) {
  const hrefPath = item.href.split('?')[0];
  const matchPrefixes = item.match ?? [];

  const pathMatches = matchPrefixes.length > 0
    ? matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
    : item.exact
      ? pathname === hrefPath
      : pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);

  if (!pathMatches) return false;
  if (!item.query) return true;
  if (!searchParams) return false;

  return Object.entries(item.query).every(([key, value]) => {
    const param = searchParams.get(key);
    if (value === null) return param === null;
    return param === value;
  });
}
