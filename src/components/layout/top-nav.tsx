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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary/10 focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
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

        <div className="flex flex-1 items-center justify-end gap-2">
          <CommandPalette items={commands} compactTrigger className="hidden sm:flex" />
          <QuickCreateButton />
          <ThemeToggle />
          <div className="hidden md:flex items-center gap-2">{desktop}</div>
          <div className="flex items-center gap-2 md:hidden">{mobile}</div>
        </div>
      </div>
    </header>
  );
}
