import { fetchClientAppointments } from '@/lib/appointments/queries';
import { fetchStaffCases } from '@/lib/cases/fetchers';
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

  if (access.canAccessOpsFrontline || access.canAccessOpsAdmin) {
    try {
      const cases = await fetchStaffCases(supabase, 10);
      cases.forEach((item) => {
        commands.push({
          href: `/ops/clients/${item.personId ?? item.id}?case=${item.id}&tab=overview`,
          label: item.caseType ?? `Case #${item.id}`,
          group: 'Clients · Cases',
        });
      });
    } catch (error) {
      console.warn('Command palette cases unavailable', error);
    }
  }

  if (access.canManageConsents || access.canManageOrgUsers || access.canAccessOpsFrontline || access.canAccessOpsAdmin) {
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
            href: `/ops/clients/${person.id}?tab=overview`,
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
