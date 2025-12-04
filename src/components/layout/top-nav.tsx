import Image from 'next/image';
import Link from 'next/link';
import { CommandPalette } from '@/components/layout/command-palette';
import { QuickCreateButton } from '@/components/layout/quick-create-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AppNavigationMobile } from '@/components/layout/app-navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Sparkles } from 'lucide-react';
import { resolveAppIcon } from '@/lib/app-icons';
import type { CommandPaletteItem } from '@/lib/portal-access';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@/components/layout/user-nav';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import type { NavSection } from '@/lib/portal-navigation';

type TopNavProps = {
  navSections: NavSection[];
  globalNavItems: PrimaryNavItem[];
  commands: CommandPaletteItem[];
  navigation: UserNavigation;
  branding: ResolvedBrandingAssets;
};

export function TopNav({
  navSections,
  globalNavItems,
  commands,
  navigation,
  branding,
}: TopNavProps) {
  const { desktop, mobile } = navigation;
  const hasNav = navSections.length > 0;

  return (
    <header className="sticky top-0 z-50 border-b-2 border-primary bg-surface-container/90 text-on-surface shadow-level-2 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-container/82">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary/10 focus:px-3 focus:py-2 focus:text-on-primary"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-page items-center gap-space-sm px-space-lg py-space-2xs">
        <div className="flex min-w-0 flex-1 items-center gap-space-sm">
          {hasNav ? (
            <div className="lg:hidden">
              <AppNavigationMobile navSections={navSections} globalNavItems={globalNavItems} />
            </div>
          ) : null}
          <Link
            href="/"
            className="inline-flex items-center gap-space-sm rounded-[var(--md-sys-shape-corner-small)] border border-transparent px-space-sm py-space-2xs transition-colors hover:border-outline/30 hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
              <span className="block text-title-sm font-semibold text-on-surface">STEVI</span>
              <span className="block text-label-sm text-on-surface-variant">Client Support Portal</span>
            </span>
          </Link>
          <Badge variant="secondary" className="hidden sm:inline-flex items-center gap-space-2xs">IHARC</Badge>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-space-2xs lg:flex">
          <CommandPalette items={commands} compactTrigger />
          <GlobalShortcuts items={globalNavItems} />
        </div>

        <div className="flex items-center gap-space-2xs md:hidden">
          <QuickCreateButton />
          <CommandPalette items={commands} compactTrigger />
          {mobile}
          <ThemeToggle />
        </div>
        <div className="hidden items-center gap-space-xs md:flex">
          <QuickCreateButton />
          <CommandPalette items={commands} compactTrigger className="lg:hidden" />
          <GlobalShortcuts items={globalNavItems} className="lg:hidden" />
          <ThemeToggle />
          {desktop}
        </div>
      </div>
    </header>
  );
}

type GlobalShortcutsProps = {
  items: PrimaryNavItem[];
  className?: string;
};

function GlobalShortcuts({ items, className }: GlobalShortcutsProps) {
  if (!items || items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={className}
          aria-label="Workspace shortcuts"
        >
          <Icon icon={Sparkles} size="sm" className="text-on-surface-variant" />
          <span className="text-label-md font-semibold">Shortcuts</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[240px]">
        {items.map((item) => (
          <DropdownMenuItem key={item.id} asChild className="flex items-center gap-space-sm py-space-sm">
            <Link href={item.href} className="flex items-center gap-space-sm">
              <Icon icon={resolveAppIcon(item.icon)} size="sm" className="text-on-surface-variant" />
              <span className="flex flex-col leading-tight">
                <span className="text-label-md font-semibold text-on-surface">{item.label}</span>
                {item.description ? (
                  <span className="text-label-sm text-on-surface-variant">{item.description}</span>
                ) : null}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
