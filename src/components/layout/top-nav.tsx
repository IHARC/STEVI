import Image from 'next/image';
import Link from 'next/link';
import { CommandPalette } from '@/components/layout/command-palette';
import { QuickCreateButton } from '@/components/layout/quick-create-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { WorkspaceDrawerMobile } from '@/components/layout/workspace-drawer';
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher';
import type { CommandPaletteItem, WorkspaceNav } from '@/lib/portal-access';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@/components/layout/user-nav';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import type { WorkspaceId, WorkspaceOption } from '@/lib/workspaces';

type TopNavProps = {
  workspaceNav: WorkspaceNav | null;
  globalNavItems: PrimaryNavItem[];
  workspaceOptions: WorkspaceOption[];
  activeWorkspace: WorkspaceId;
  isClientPreview: boolean;
  commands: CommandPaletteItem[];
  navigation: UserNavigation;
  branding: ResolvedBrandingAssets;
};

export function TopNav({
  workspaceNav,
  globalNavItems,
  workspaceOptions,
  activeWorkspace,
  isClientPreview,
  commands,
  navigation,
  branding,
}: TopNavProps) {
  const { desktop, mobile } = navigation;
  const hasWorkspaceNav = Boolean(workspaceNav?.groups.length);
  const hasWorkspaces = workspaceOptions.length > 0 && activeWorkspace !== 'client';

  return (
    <header className="sticky top-0 z-50 border-b border-outline/12 bg-surface/92 text-on-surface shadow-level-2 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex w-full max-w-page items-center gap-space-sm px-space-lg py-space-sm">
        <div className="flex flex-1 items-center gap-space-sm min-w-0">
          {hasWorkspaceNav ? (
            <div className="lg:hidden">
              <WorkspaceDrawerMobile
                key={workspaceNav?.id ?? 'workspace-drawer-mobile'}
                workspaceNav={workspaceNav}
                globalNavItems={globalNavItems}
              />
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
          {hasWorkspaces ? (
            <div className="hidden min-w-[320px] flex-1 items-center lg:flex">
              <WorkspaceSwitcher
                options={workspaceOptions}
                activeWorkspace={activeWorkspace}
                isPreview={isClientPreview}
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-space-2xs md:hidden">
          {hasWorkspaces ? (
            <WorkspaceSwitcher
              options={workspaceOptions}
              activeWorkspace={activeWorkspace}
              isPreview={isClientPreview}
            />
          ) : null}
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
