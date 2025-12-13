'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select';

export type SettingsNavItem = {
  label: string;
  href: string;
  match?: string[];
  items?: SettingsNavItem[];
};

export type SettingsNavGroup = {
  label?: string;
  items: SettingsNavItem[];
};

export function SettingsNav({ nav }: { nav: SettingsNavGroup[] }) {
  const pathname = usePathname() ?? '/';
  const cleaned = pathname.split('?')[0];
  const activeHref = resolveActiveHref(nav, cleaned);

  return (
    <nav aria-label="Settings navigation" className="space-y-4">
      {nav.map((group, groupIndex) => (
        <div key={`${group.label ?? 'group'}-${groupIndex}`} className="space-y-2">
          {group.label ? (
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
          ) : null}
          <ul className="space-y-1">
            {group.items.map((item) => (
              <SettingsNavItemRow key={item.href} item={item} activeHref={activeHref} pathname={cleaned} depth={0} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function SettingsNavSelect({ nav }: { nav: SettingsNavGroup[] }) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const cleaned = pathname.split('?')[0];
  const activeHref = resolveActiveHref(nav, cleaned);
  const options = flattenNavForMobile(nav, cleaned);

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section</p>
      <Select
        value={activeHref}
        onValueChange={(nextHref) => {
          router.push(nextHref);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a section" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.href} value={option.href}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SettingsNavItemRow({
  item,
  activeHref,
  pathname,
  depth,
}: {
  item: SettingsNavItem;
  activeHref: string;
  pathname: string;
  depth: number;
}) {
  const isActive = item.href === activeHref;
  const inActiveBranch = isItemInBranch(item, pathname);

  return (
    <li>
      <Link
        href={item.href}
        className={cn(
          'flex items-center rounded-lg px-2 py-2 text-sm transition-colors',
          depth === 0 ? 'font-medium' : 'font-normal',
          depth > 0 ? 'pl-6' : null,
          isActive
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.label}
      </Link>
      {item.items && item.items.length && inActiveBranch ? (
        <ul className="mt-1 space-y-1">
          {item.items.map((child) => (
            <SettingsNavItemRow
              key={child.href}
              item={child}
              activeHref={activeHref}
              pathname={pathname}
              depth={depth + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function resolveActiveHref(nav: SettingsNavGroup[], pathname: string) {
  let activeHref = nav[0]?.items[0]?.href ?? '/';
  let bestMatchLength = -1;

  const visit = (item: SettingsNavItem) => {
    const prefixes = item.match ?? [item.href];
    prefixes.forEach((prefix) => {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        if (prefix.length > bestMatchLength) {
          bestMatchLength = prefix.length;
          activeHref = item.href;
        }
      }
    });
    item.items?.forEach(visit);
  };

  nav.forEach((group) => group.items.forEach(visit));
  return activeHref;
}

function flattenNavForMobile(nav: SettingsNavGroup[], pathname: string) {
  const flattened: Array<{ label: string; href: string }> = [];

  const visitTopLevel = (item: SettingsNavItem, trail: string[]) => {
    const nextTrail = [...trail, item.label];
    flattened.push({ label: nextTrail.join(' › '), href: item.href });

    if (!item.items?.length) return;
    if (!isItemInBranch(item, pathname)) return;
    item.items.forEach((child) => visitChild(child, nextTrail));
  };

  const visitChild = (item: SettingsNavItem, trail: string[]) => {
    const nextTrail = [...trail, item.label];
    flattened.push({ label: nextTrail.join(' › '), href: item.href });
    item.items?.forEach((child) => visitChild(child, nextTrail));
  };

  nav.forEach((group) => {
    const baseTrail = group.label ? [group.label] : [];
    group.items.forEach((item) => visitTopLevel(item, baseTrail));
  });

  return flattened;
}

function isItemInBranch(item: SettingsNavItem, pathname: string): boolean {
  const prefixes = item.match ?? [item.href];
  const directMatch = prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (directMatch) return true;
  return (item.items ?? []).some((child) => isItemInBranch(child, pathname));
}
