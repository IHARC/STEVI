import Image from 'next/image';
import Link from 'next/link';
import { CommandPalette } from '@/components/layout/command-palette';
import { QuickCreateButton } from '@/components/layout/quick-create-button';
import { getUserNavigation } from '@/components/layout/user-nav';
import { buildCommandPaletteItems, type PortalAccess, type CommandPaletteItem } from '@/lib/portal-access';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { WorkspaceSwitcherSlot } from '@/components/layout/workspace-switcher-slot';
import { getBrandingAssets } from '@/lib/marketing/branding';
import { isClientPreview, resolveWorkspaceQuickActions } from '@/lib/workspaces';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { fetchStaffCases } from '@/lib/cases/fetchers';
import { listResources } from '@/lib/resources';
import { loadPortalAccess } from '@/lib/portal-access';
import type { Resource } from '@/lib/resources';
import type { Database } from '@/types/supabase';
type PeopleListItem = Database['core']['Tables']['people']['Row'] & { email?: string | null; phone?: string | null };

type TopNavProps = {
  portalAccess?: PortalAccess | null;
};

export async function TopNav({ portalAccess }: TopNavProps = {}) {
  const supabase = await createSupabaseRSCClient();
  const access = portalAccess ?? (await loadPortalAccess(supabase));

  const [navigation, branding] = await Promise.all([
    getUserNavigation(access),
    getBrandingAssets(),
  ]);
  const { desktop, mobile } = navigation;
  const previewingClient = isClientPreview(access ?? null, 'client');
  const quickActions = resolveWorkspaceQuickActions(access ?? null, 'client', {
    isPreview: previewingClient,
  })
    .filter((action) => !action.disabled)
    .map((action) => ({ href: action.href, label: action.label, group: 'Actions' }));
  const entityCommands = await buildEntityCommands(supabase, access);
  const commands = buildCommandPaletteItems(access ?? null, [...quickActions, ...entityCommands]);

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
    </header>
  );
}

async function buildEntityCommands(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  access: PortalAccess | null,
): Promise<CommandPaletteItem[]> {
  if (!access) return [];
  const commands: CommandPaletteItem[] = [];

  if (access.canAccessStaffWorkspace || access.canAccessAdminWorkspace) {
    try {
      const cases = await fetchStaffCases(supabase, 10);
      cases.forEach((item) => {
        commands.push({
          href: `/staff/cases/${item.id}`,
          label: item.caseType ?? `Case #${item.id}`,
          group: 'Cases',
        });
      });
    } catch (error) {
      console.warn('Command palette cases unavailable', error);
    }
  }

  if (access.canManageResources) {
    try {
      const resources = await listResources({}, { pageSize: 6, includeUnpublished: false });
      resources.items.forEach((resource: Resource) => {
        commands.push({
          href: `/admin/resources/${resource.slug}`,
          label: resource.title,
          group: 'Resources',
        });
      });
    } catch (error) {
      console.warn('Command palette resources unavailable', error);
    }
  }

  if (access.canManageConsents || access.canManageOrgUsers || access.canAccessStaffWorkspace) {
    try {
      const { data, error } = await supabase.rpc('get_people_list_with_types', {
        p_page: 1,
        p_page_size: 15,
        p_person_types: null,
        p_status: null,
      });

      if (!error) {
        (data ?? []).forEach((person: PeopleListItem) => {
          commands.push({
            href: `/admin/clients/${person.id}`,
            label: `${person.first_name ?? 'Client'} ${person.last_name ?? ''}`.trim(),
            group: 'Clients',
          });
        });
      }
    } catch (error) {
      console.warn('Command palette clients unavailable', error);
    }
  }

  return commands;
}
