import Image from 'next/image';
import Link from 'next/link';
import { CommandPalette } from '@/components/layout/command-palette';
import { QuickCreateButton } from '@/components/layout/quick-create-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { AppNavigationMobile } from '@/components/layout/app-navigation';
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
    <header className="sticky top-0 z-50 border-b border-outline/12 bg-surface/92 text-on-surface shadow-level-2 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex w-full max-w-page items-center gap-space-sm px-space-lg py-space-sm">
        <div className="flex flex-1 items-center gap-space-sm min-w-0">
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
              width={72}
              height={72}
              priority
              className="h-10 w-auto dark:hidden"
            />
            <Image
              src={branding.logoDarkUrl}
              alt="IHARC"
              width={72}
              height={72}
              priority
              className="hidden h-9 w-auto dark:block"
            />
            <span className="text-left leading-tight">
              <span className="block text-title-sm font-semibold text-on-surface">STEVI · Client Support Portal</span>
              <span className="block text-label-sm text-on-surface-variant">IHARC</span>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-space-2xs md:hidden">
          <QuickCreateButton />
          <CommandPalette items={commands} compactTrigger />
          {mobile}
          <ThemeToggle />
        </div>
        <div className="hidden items-center gap-space-sm md:flex">
          <QuickCreateButton />
          <CommandPalette items={commands} compactTrigger />
          <ThemeToggle />
          {desktop}
        </div>
      </div>
    </header>
  );
}
