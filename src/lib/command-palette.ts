import { fetchClientAppointments } from '@/lib/appointments/queries';
import { fetchStaffCases } from '@/lib/cases/fetchers';
import { listResources, type Resource } from '@/lib/resources';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { CommandPaletteItem, PortalAccess } from '@/lib/portal-access';
import type { Database } from '@/types/supabase';

type PeopleListItem = Database['core']['Tables']['people']['Row'] & {
  email?: string | null;
  phone?: string | null;
};

export async function buildEntityCommandPaletteItems(
  supabase: SupabaseAnyServerClient,
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
      const core = supabase.schema('core');
      const { data, error } = await core.rpc('get_people_list_with_types', {
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

  try {
    const { upcoming, past } = await fetchClientAppointments(supabase, access.profile.id);
    [...upcoming, ...past].slice(0, 5).forEach((appt) => {
      commands.push({
        href: '/appointments',
        label: appt.title ?? 'Appointment',
        group: 'My appointments',
      });
    });
  } catch (error) {
    console.warn('Command palette appointments unavailable', error);
  }

  return commands;
}
