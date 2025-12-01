import Image from 'next/image';
import Link from 'next/link';
import { CommandPalette } from '@/components/layout/command-palette';
import { QuickCreateButton } from '@/components/layout/quick-create-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { WorkspaceSwitcherSlot } from '@/components/layout/workspace-switcher-slot';
import { PrimaryNavBar, PrimaryNavMobile } from '@/components/layout/primary-nav';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import type { CommandPaletteItem } from '@/lib/portal-access';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@/components/layout/user-nav';

type TopNavProps = {
  primaryNavItems: PrimaryNavItem[];
  commands: CommandPaletteItem[];
  navigation: UserNavigation;
  branding: ResolvedBrandingAssets;
};

export function TopNav({ primaryNavItems, commands, navigation, branding }: TopNavProps) {
  const { desktop, mobile } = navigation;

  return (
    <header className="sticky top-0 z-50 border-b border-outline/14 bg-surface/95 text-on-surface shadow-level-2 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex w-full max-w-page items-center justify-between gap-space-sm px-space-lg py-space-sm md:py-space-md">
        <div className="flex items-center gap-space-sm">
          <div className="md:hidden">
            <PrimaryNavMobile items={primaryNavItems} />
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-space-sm rounded-2xl border border-transparent px-space-sm py-space-2xs transition-colors hover:border-outline/30 hover:bg-surface-container-low focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
              className="hidden h-10 w-auto dark:block"
            />
            <span className="text-left">
              <span className="block text-label-sm font-semibold uppercase tracking-label-uppercase text-primary">STEVI</span>
              <span className="block text-title-sm font-semibold text-on-surface">Client Support Portal</span>
            </span>
          </Link>
          <div className="hidden md:block">
            <WorkspaceSwitcherSlot />
          </div>
        </div>
        <div className="flex items-center gap-space-2xs md:hidden">
          <QuickCreateButton />
          <CommandPalette items={commands} compactTrigger />
          {mobile}
          <ThemeToggle />
        </div>
        <div className="hidden items-center gap-space-sm md:flex">
          <QuickCreateButton />
          <CommandPalette items={commands} />
          <ThemeToggle />
          {desktop}
        </div>
      </div>
      <PrimaryNavBar items={primaryNavItems} className="md:px-space-lg md:pb-space-xs md:pt-0" />
    </header>
  );
}
