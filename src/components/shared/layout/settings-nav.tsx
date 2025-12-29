'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export type SettingsNavItem = {
  label: string;
  href: string;
  match?: string[];
  items?: SettingsNavItem[];
  derived?: boolean;
};

export type SettingsNavGroup = {
  label?: string;
  items: SettingsNavItem[];
};

export function SettingsNav({ nav, onNavigate }: { nav: SettingsNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname() ?? '/';
  const cleaned = pathname.split('?')[0];
  const activeHref = resolveActiveHref(nav, cleaned);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

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
              <SettingsNavItemRow
                key={item.href}
                item={item}
                activeHref={activeHref}
                pathname={cleaned}
                depth={0}
                onNavigate={onNavigate}
                expandedItems={expandedItems}
                onToggle={(href) => {
                  setExpandedItems((prev) => ({
                    ...prev,
                    [href]: !prev[href],
                  }));
                }}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SettingsNavItemRow({
  item,
  activeHref,
  pathname,
  depth,
  onNavigate,
  expandedItems,
  onToggle,
}: {
  item: SettingsNavItem;
  activeHref: string;
  pathname: string;
  depth: number;
  onNavigate?: () => void;
  expandedItems: Record<string, boolean>;
  onToggle: (href: string) => void;
}) {
  const isActive = item.href === activeHref && !item.derived;
  const inActiveBranch = isItemInBranch(item, pathname);
  const hasChildren = Boolean(item.items && item.items.length);
  const isExpanded = hasChildren && (expandedItems[item.href] || inActiveBranch);
  const childItems = hasChildren ? deriveChildItems(item) : [];

  return (
    <li>
      {hasChildren ? (
        <button
          type="button"
          onClick={() => onToggle(item.href)}
          aria-expanded={isExpanded}
          aria-controls={`settings-${slugifyNavKey(item.href)}-${depth}`}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-sm transition-colors',
            depth === 0 ? 'font-medium' : 'font-normal',
            depth > 0 ? 'pl-6' : null,
            isActive
              ? 'bg-secondary/70 text-foreground border-primary/30'
              : inActiveBranch
                ? 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        >
          <span className="flex-1 truncate text-left">{item.label}</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded ? 'rotate-180' : undefined)} aria-hidden />
        </button>
      ) : (
        <Link
          href={item.href}
          onClick={(event) => {
            if (!onNavigate) return;
            if (event.defaultPrevented) return;
            if (event.button !== 0) return;
            if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
            onNavigate();
          }}
          className={cn(
            'flex items-center rounded-lg border border-transparent px-2 py-2 text-sm transition-colors',
            depth === 0 ? 'font-medium' : 'font-normal',
            depth > 0 ? 'pl-6' : null,
            isActive
              ? 'bg-secondary/70 text-foreground border-primary/30'
              : inActiveBranch
                ? 'text-foreground/80 hover:bg-muted/70 hover:text-foreground'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
          aria-current={isActive ? 'page' : undefined}
        >
          {item.label}
        </Link>
      )}
      {hasChildren && isExpanded ? (
        <ul id={`settings-${slugifyNavKey(item.href)}-${depth}`} className="mt-1 space-y-1 border-l border-border/50 pl-3">
          {childItems.map((child) => (
            <SettingsNavItemRow
              key={child.href}
              item={child}
              activeHref={activeHref}
              pathname={pathname}
              depth={depth + 1}
              onNavigate={onNavigate}
              expandedItems={expandedItems}
              onToggle={onToggle}
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

function isItemInBranch(item: SettingsNavItem, pathname: string): boolean {
  const prefixes = item.match ?? [item.href];
  const directMatch = prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (directMatch) return true;
  return (item.items ?? []).some((child) => isItemInBranch(child, pathname));
}

function deriveChildItems(item: SettingsNavItem): SettingsNavItem[] {
  const children = item.items ?? [];
  if (!children.length) return [];
  const hasParentLink = children.some((child) => child.href === item.href);
  if (hasParentLink) return children;
  return [{ ...item, label: 'Overview', items: undefined, derived: true }, ...children];
}

function slugifyNavKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
