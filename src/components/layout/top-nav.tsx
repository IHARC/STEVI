import Image from 'next/image';
import Link from 'next/link';
import { CommandPalette } from '@/components/layout/command-palette';
import { QuickCreateButton } from '@/components/layout/quick-create-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AppNavigationMobile } from '@/components/layout/app-navigation';
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
  const { desktop, mobile } = navigation;
  const hasNav = navSections.length > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-outline/12 bg-surface-container/80 text-on-surface shadow-level-1 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-container/72">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary/10 focus:px-3 focus:py-2 focus:text-on-primary"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-page items-center gap-space-sm px-space-lg py-space-3xs">
        <div className="flex min-w-0 flex-1 items-center gap-space-sm">
          {hasNav ? (
            <div className="lg:hidden">
              <AppNavigationMobile navSections={navSections} />
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
        </div>

        <div className="flex flex-1 items-center justify-end gap-space-2xs">
          <CommandPalette items={commands} compactTrigger className="hidden sm:flex" />
          <QuickCreateButton />
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-space-2xs">{desktop}</div>
          <div className="flex items-center gap-space-2xs md:hidden">{mobile}</div>
        </div>
      </div>
    </header>
  );
}
