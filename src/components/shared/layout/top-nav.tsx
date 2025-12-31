'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@shared/ui/navigation-menu';
import { CommandPalette } from '@shared/layout/command-palette';
import { ThemeToggle } from '@shared/layout/theme-toggle';
import { AppNavigationMobile } from '@shared/layout/app-navigation';
import { ClientOnly } from '@shared/layout/client-only';
import { APP_ICON_MAP, type AppIconName } from '@/lib/app-icons';
import { cn } from '@/lib/utils';
import { useOptionalPortalLayout } from '@shared/providers/portal-layout-provider';
import { usePortalAccess } from '@shared/providers/portal-access-provider';
import { BrandLogo } from '@shared/branding/brand-logo';
import type { CommandPaletteItem } from '@/lib/portal-access';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@shared/layout/user-nav';
import type { NavSection } from '@/lib/portal-navigation';

type TopNavProps = {
  navSections: NavSection[];
  commands: CommandPaletteItem[];
  navigation: UserNavigation;
  branding: ResolvedBrandingAssets;
};

export function TopNav({
  navSections,
  commands,
  navigation,
  branding,
}: TopNavProps) {
  const pathname = usePathname() ?? '/';
  const { desktop, mobile } = navigation;
  const hasNav = navSections.length > 0;
  const layout = useOptionalPortalLayout();
  const portalAccess = usePortalAccess();
  const activeArea = layout?.activeArea ?? 'client';
  const showMegaMenu = hasNav && activeArea === 'client';
  const showAdminSwitcher = Boolean(portalAccess?.canAccessOpsSteviAdmin) && (activeArea === 'ops_frontline' || activeArea === 'app_admin');
  const adminSwitchHref = activeArea === 'app_admin' ? '/ops/today' : '/app-admin';
  const adminSwitchLabel = activeArea === 'app_admin' ? 'Switch to Operations' : 'Switch to Admin';
  const adminSwitchAria = activeArea === 'app_admin' ? 'Switch to Operations workspace' : 'Switch to Admin workspace';
  const hamburgerBreakpointClass = 'lg:hidden';
  const subtitle =
    activeArea === 'ops_frontline'
      ? 'Operations portal'
      : activeArea === 'app_admin'
          ? 'STEVI Admin portal'
          : 'Client portal';

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background text-foreground shadow-sm">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary/10 focus:px-3 focus:py-2 focus:text-primary"
      >
        Skip to content
      </a>
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="grid h-16 w-full grid-cols-[auto_1fr] items-center gap-3 md:gap-4 lg:grid-cols-[auto_1fr_auto]">
          <div className="flex min-w-0 items-center gap-3">
            {hasNav ? (
              <div className={hamburgerBreakpointClass}>
                <ClientOnly fallback={<div className="h-11 w-11" aria-hidden />}>
                  <AppNavigationMobile
                    navSections={navSections}
                    mode={activeArea === 'client' ? 'full' : 'hubs'}
                  />
                </ClientOnly>
              </div>
            ) : null}
            <Link
              href="/"
              className="inline-flex min-w-0 items-center gap-3 rounded-lg border border-transparent px-3 py-1.5 transition-colors hover:border-border/50 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="STEVI home"
            >
              <BrandLogo branding={branding} priority />
              <BrandLogo branding={branding} variant="dark" priority />
              <span className="min-w-0 text-left leading-snug">
                <span className="block truncate text-base font-semibold text-foreground">STEVI</span>
                <span className="hidden truncate text-xs text-muted-foreground lg:block">{subtitle}</span>
              </span>
            </Link>
          </div>

          {showMegaMenu ? (
            <nav aria-label="Primary navigation" className="hidden min-w-0 lg:flex xl:hidden">
              <ClientOnly>
                <TopNavMenu navSections={navSections} pathname={pathname} />
              </ClientOnly>
            </nav>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            {showAdminSwitcher ? (
              <Link
                href={adminSwitchHref}
                className="hidden md:inline-flex items-center rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
                aria-label={adminSwitchAria}
              >
                {adminSwitchLabel}
              </Link>
            ) : null}
            <ClientOnly fallback={<div className="hidden sm:flex h-9 w-9" aria-hidden />}>
              <CommandPalette items={commands} compactTrigger className="hidden sm:flex" />
            </ClientOnly>
            <ClientOnly fallback={<div className="h-10 w-10" aria-hidden />}>
              <ThemeToggle />
            </ClientOnly>
            <div className="hidden md:flex items-center gap-2">
              <ClientOnly>{desktop}</ClientOnly>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <ClientOnly>{mobile}</ClientOnly>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

type NavMenuProps = {
  navSections: NavSection[];
  pathname: string;
};

function TopNavMenu({ navSections, pathname }: NavMenuProps) {
  return (
    <NavigationMenu className="w-full max-w-full justify-start">
      <NavigationMenuList className="justify-start">
        {navSections.map((section) => (
          <NavigationMenuItem key={section.id}>
            <NavigationMenuTrigger className="text-sm font-semibold capitalize">{section.label}</NavigationMenuTrigger>
            <NavigationMenuContent className="p-4">
              <div className="grid gap-4 md:w-[520px] md:grid-cols-2">
                {section.groups.map((group) => {
                  const GroupIcon = group.icon ? APP_ICON_MAP[group.icon] : null;
                  return (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {GroupIcon ? <GroupIcon className="h-4 w-4" aria-hidden /> : null}
                        <span>{group.label}</span>
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <NavigationMenuLink asChild key={item.href} className="focus-visible:outline-none">
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted',
                                isLinkActive(item, pathname) ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                              )}
                            >
                              {item.icon ? <NavIcon name={item.icon} /> : null}
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </NavigationMenuLink>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function NavIcon({ name }: { name: AppIconName }) {
  const Icon = APP_ICON_MAP[name];
  if (!Icon) return null;
  return <Icon className="h-4 w-4" aria-hidden />;
}

function isLinkActive(link: Pick<NavSection['groups'][number]['items'][number], 'href' | 'match' | 'exact'>, pathname: string) {
  const hrefPath = link.href.split('?')[0];
  const matchPrefixes = link.match ?? [];
  if (matchPrefixes.length > 0) {
    return matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  if ('exact' in link && link.exact) {
    return pathname === hrefPath;
  }

  if (pathname === hrefPath) return true;
  return pathname.startsWith(`${hrefPath}/`);
}
