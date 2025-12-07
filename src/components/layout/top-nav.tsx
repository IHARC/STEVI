'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from '@/components/ui/navigation-menu';
import { CommandPalette } from '@/components/layout/command-palette';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AppNavigationMobile } from '@/components/layout/app-navigation';
import { APP_ICON_MAP, type AppIconName } from '@/lib/app-icons';
import { cn } from '@/lib/utils';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptionalPortalLayout } from '@/components/providers/portal-layout-provider';
import type { CommandPaletteItem } from '@/lib/portal-access';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@/components/layout/user-nav';
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
  const showClientPreviewCta = layout?.activeArea !== 'client';

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary/10 focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="mx-auto w-full max-w-6xl px-4 py-3 md:px-6">
        <div className="grid w-full grid-cols-[auto_1fr] items-center gap-3 md:gap-4 lg:grid-cols-[auto_1fr_auto]">
          <div className="flex min-w-0 items-center gap-3">
            {hasNav ? (
              <div className="lg:hidden">
                <AppNavigationMobile navSections={navSections} />
              </div>
            ) : null}
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-lg border border-transparent px-3 py-1.5 transition-colors hover:border-border/50 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="STEVI home"
            >
              <Image
                src={branding.logoLightUrl}
                alt="IHARC"
                width={56}
                height={56}
                priority
                className="h-9 w-auto dark:hidden"
              />
              <Image
                src={branding.logoDarkUrl}
                alt="IHARC"
                width={56}
                height={56}
                priority
                className="hidden h-8 w-auto dark:block"
              />
              <span className="text-left leading-tight">
                <span className="block text-base font-semibold text-foreground">STEVI</span>
                <span className="block text-xs text-muted-foreground">Client Support Portal</span>
              </span>
            </Link>
          </div>

          {hasNav ? (
            <nav aria-label="Primary navigation" className="hidden min-w-0 lg:flex">
              <TopNavMenu navSections={navSections} pathname={pathname} />
            </nav>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            {showClientPreviewCta ? (
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="hidden sm:inline-flex"
              >
                <Link href="/home" aria-label="Preview client portal">
                  <Eye className="h-4 w-4" aria-hidden />
                  <span className="text-sm font-semibold">Preview client portal</span>
                </Link>
              </Button>
            ) : null}
            <CommandPalette items={commands} compactTrigger className="hidden sm:flex" />
            <ThemeToggle />
            <div className="hidden md:flex items-center gap-2">{desktop}</div>
            <div className="flex items-center gap-2 md:hidden">{mobile}</div>
            {showClientPreviewCta ? (
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="sm:hidden"
              >
                <Link href="/home" aria-label="Preview client portal">
                  <Eye className="h-4 w-4" aria-hidden />
                  <span className="text-sm font-semibold">Preview portal</span>
                </Link>
              </Button>
            ) : null}
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
  const matchPrefixes = link.match ?? [];
  if (matchPrefixes.length > 0) {
    return matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  if ('exact' in link && link.exact) {
    return pathname === link.href;
  }

  if (pathname === link.href) return true;
  return pathname.startsWith(`${link.href}/`);
}
