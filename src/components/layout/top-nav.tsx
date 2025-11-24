import Image from 'next/image';
import Link from 'next/link';
import { CommandPalette } from '@/components/layout/command-palette';
import { getUserNavigation } from '@/components/layout/user-nav';
import { buildCommandPaletteItems, type PortalAccess } from '@/lib/portal-access';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { WorkspaceSwitcherSlot } from '@/components/layout/workspace-switcher-slot';
import { getBrandingAssets } from '@/lib/marketing/branding';

type TopNavProps = {
  portalAccess?: PortalAccess | null;
};

export async function TopNav({ portalAccess }: TopNavProps = {}) {
  const [navigation, branding] = await Promise.all([
    getUserNavigation(portalAccess),
    getBrandingAssets(),
  ]);
  const { desktop, mobile } = navigation;
  const commands = buildCommandPaletteItems(portalAccess ?? null);

  return (
    <header className="border-b border-outline/20 bg-surface/95 text-on-surface backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex w-full max-w-page items-center justify-between gap-space-sm px-space-md py-space-md">
        <div className="flex items-center gap-space-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-space-sm rounded-lg px-space-sm py-space-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
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
              <span className="block text-label-sm font-medium uppercase text-muted-foreground">
                STEVI
              </span>
              <span className="block text-title-sm font-medium text-on-surface">
                Client Support Portal
              </span>
            </span>
          </Link>
          <WorkspaceSwitcherSlot />
        </div>
        <div className="flex items-center gap-space-xs md:hidden">
          <CommandPalette items={commands} compactTrigger />
          {mobile}
          <ThemeToggle />
        </div>
        <div className="hidden items-center gap-space-sm md:flex">
          <CommandPalette items={commands} />
          <ThemeToggle />
          {desktop}
        </div>
      </div>
    </header>
  );
}
