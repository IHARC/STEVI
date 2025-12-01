import Image from 'next/image';
import Link from 'next/link';
import { CommandPalette } from '@/components/layout/command-palette';
import { QuickCreateButton } from '@/components/layout/quick-create-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { WorkspaceDrawerMobile } from '@/components/layout/workspace-drawer';
import { Icon } from '@/components/ui/icon';
import { resolveAppIcon } from '@/lib/app-icons';
import type { PrimaryNavItem } from '@/lib/primary-nav';
import type { CommandPaletteItem, WorkspaceNav } from '@/lib/portal-access';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';
import type { UserNavigation } from '@/components/layout/user-nav';
import type { WorkspaceId, WorkspaceOption } from '@/lib/workspaces';
import { cn } from '@/lib/utils';

type TopNavProps = {
  workspaceNav: WorkspaceNav | null;
  globalNavItems: PrimaryNavItem[];
  workspaceOptions: WorkspaceOption[];
  activeWorkspace: WorkspaceId;
  currentPath: string;
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
  currentPath,
  isClientPreview,
  commands,
  navigation,
  branding,
}: TopNavProps) {
  const { desktop, mobile } = navigation;
  const hasWorkspaceNav = Boolean(workspaceNav?.groups.length);
  const hasGlobalMenu = workspaceOptions.length > 0 || globalNavItems.length > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-outline/14 bg-surface/95 text-on-surface shadow-level-2 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex w-full max-w-page items-center justify-between gap-space-sm px-space-lg py-space-sm md:py-space-md">
        <div className="flex items-center gap-space-sm">
          {hasWorkspaceNav ? (
            <div className="lg:hidden">
              <WorkspaceDrawerMobile workspaceNav={workspaceNav} />
            </div>
          ) : null}
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
      {hasGlobalMenu ? (
        <div className="border-t border-outline/10 bg-surface/90">
          <nav aria-label="Global navigation" className="mx-auto w-full max-w-page px-space-lg">
            <div className="flex items-center gap-space-sm overflow-x-auto pb-space-xs pt-space-2xs">
              <div className="flex min-w-0 items-center gap-space-2xs">
                {workspaceOptions.map((option) => (
                  <WorkspaceNavPill
                    key={option.id}
                    option={option}
                    isActive={option.id === activeWorkspace}
                    isPreview={isClientPreview && option.id === 'client'}
                  />
                ))}
              </div>
              {workspaceOptions.length > 0 && globalNavItems.length > 0 ? (
                <div className="h-6 w-px flex-shrink-0 rounded-full bg-outline/20" aria-hidden />
              ) : null}
              {globalNavItems.length ? (
                <div className="flex min-w-0 items-center gap-space-2xs">
                  {globalNavItems.map((item) => (
                    <GlobalNavPill key={item.id} item={item} isActive={isPrimaryLinkActive(item, currentPath)} />
                  ))}
                </div>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

type WorkspaceNavPillProps = {
  option: WorkspaceOption;
  isActive: boolean;
  isPreview: boolean;
};

function WorkspaceNavPill({ option, isActive, isPreview }: WorkspaceNavPillProps) {
  return (
    <Link
      href={option.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex min-w-[164px] flex-shrink-0 flex-col gap-space-3xs rounded-2xl border px-space-md py-space-xs text-left transition-colors motion-duration-short motion-ease-standard state-layer-color-primary',
        isActive
          ? 'border-secondary-container bg-secondary-container text-on-secondary-container shadow-level-1'
          : 'border-outline/16 bg-surface-container-low text-on-surface hover:border-outline/30 hover:bg-surface-container',
      )}
    >
      <span className="flex items-center gap-space-2xs">
        <span className="text-label-md font-semibold">{option.label}</span>
        {isPreview ? (
          <span className="inline-flex items-center gap-space-2xs rounded-full bg-primary/12 px-space-2xs py-px text-label-xs font-semibold text-primary">
            Preview
          </span>
        ) : null}
      </span>
      <span className="flex flex-wrap items-center gap-space-2xs text-label-sm text-on-surface/70">
        {option.roleLabel ? <span>{option.roleLabel}</span> : null}
        {option.statusLabel ? (
          <span
            className={cn(
              'rounded-full px-space-2xs py-px text-label-xs font-semibold',
              statusToneClass(option.statusTone),
            )}
          >
            {option.statusLabel}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

type GlobalNavPillProps = {
  item: PrimaryNavItem;
  isActive: boolean;
};

function GlobalNavPill({ item, isActive }: GlobalNavPillProps) {
  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-space-2xs rounded-full border px-space-md py-space-2xs text-label-md font-semibold transition-colors motion-duration-short motion-ease-standard state-layer-color-secondary',
        isActive
          ? 'border-secondary-container bg-secondary-container text-on-secondary-container shadow-level-1'
          : 'border-outline/16 bg-surface-container-low text-on-surface hover:border-outline/30 hover:bg-surface-container',
      )}
    >
      <Icon
        icon={resolveAppIcon(item.icon)}
        size="sm"
        className={cn(isActive ? 'text-on-secondary-container' : 'text-on-surface/80')}
      />
      <span className="truncate">{item.label}</span>
      {item.description ? (
        <span className="hidden text-label-sm text-muted-foreground sm:inline">{item.description}</span>
      ) : null}
    </Link>
  );
}

function isPrimaryLinkActive(item: PrimaryNavItem, pathname: string): boolean {
  const matchPrefixes = item.match ?? [];
  if (matchPrefixes.length > 0) {
    return matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }

  if (pathname === item.href) return true;
  return pathname.startsWith(`${item.href}/`);
}

function statusToneClass(tone: WorkspaceOption['statusTone']) {
  if (tone === 'success') return 'bg-secondary-container text-on-secondary-container';
  if (tone === 'warning') return 'bg-primary-container text-on-primary-container';
  if (tone === 'critical') return 'bg-error-container text-on-error-container';
  return 'bg-surface-container-low text-muted-foreground';
}
