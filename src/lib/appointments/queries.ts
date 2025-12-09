import type { SupabaseRSCClient, SupabaseServerClient } from '@/lib/supabase/types';
import type { PortalAccess } from '@/lib/portal-access';
import type { AppointmentWithRelations } from './types';

const APPOINTMENT_SELECT = `
  id, title, description, status, requested_window, occurs_at, duration_minutes, location, location_type, meeting_url,
  client_profile_id, requester_profile_id, staff_profile_id, organization_id, confirmed_at, confirmed_by_profile_id,
  canceled_at, cancellation_reason, reschedule_note, outcome_notes, created_at, updated_at,
  client:client_profile_id ( id, display_name, organization_id ),
  requester:requester_profile_id ( id, display_name ),
  staff:staff_profile_id ( id, display_name )
`;

function splitAppointments(records: AppointmentWithRelations[]) {
  const upcomingStatuses: AppointmentWithRelations['status'][] = [
    'requested',
    'pending_confirmation',
    'reschedule_requested',
    'scheduled',
  ];
  const pastStatuses: AppointmentWithRelations['status'][] = [
    'completed',
    'cancelled_by_client',
    'cancelled_by_staff',
    'no_show',
  ];

  const upcoming: AppointmentWithRelations[] = [];
  const past: AppointmentWithRelations[] = [];

  for (const record of records) {
    if (upcomingStatuses.includes(record.status)) {
      upcoming.push(record);
      continue;
    }

    if (pastStatuses.includes(record.status)) {
      past.push(record);
      continue;
    }

    // Default to upcoming when status is unexpected to avoid hiding items.
    upcoming.push(record);
  }

  return {
    upcoming: upcoming.sort((a, b) => {
      const aTime = a.occurs_at ? Date.parse(a.occurs_at) : Number.MAX_SAFE_INTEGER;
      const bTime = b.occurs_at ? Date.parse(b.occurs_at) : Number.MAX_SAFE_INTEGER;
      if (aTime === bTime) return Date.parse(a.created_at) - Date.parse(b.created_at);
      return aTime - bTime;
    }),
    past: past.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
  };
}

export async function fetchClientAppointments(
  supabase: SupabaseRSCClient,
  profileId: string,
) {
  const { data, error } = await supabase
    .schema('portal')
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .or(`client_profile_id.eq.${profileId},requester_profile_id.eq.${profileId}`)
    .order('occurs_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load client appointments', { profileId, error });
    throw new Error('Unable to load your appointments right now.');
  }

  const records = (data ?? []) as AppointmentWithRelations[];
  return splitAppointments(records);
}

type ScopedOptions = {
  includeCompleted?: boolean;
  limit?: number;
  targetOrgId?: number | null;
};

export async function fetchScopedAppointments(
  supabase: SupabaseRSCClient | SupabaseServerClient,
  access: PortalAccess,
  options: ScopedOptions = {},
) {
  const filterParts: string[] = [];

  const targetOrgId = options.targetOrgId ?? null;

  if (access.canAccessAdminWorkspace) {
    if (targetOrgId) {
      filterParts.push(`organization_id.eq.${targetOrgId}`);
    }
  } else if (access.canAccessOrgWorkspace && access.organizationId) {
    filterParts.push(`organization_id.eq.${access.organizationId}`);
  } else if (access.canAccessStaffWorkspace) {
    filterParts.push(`staff_profile_id.eq.${access.profile.id}`);
    if (access.organizationId) {
      filterParts.push(`organization_id.eq.${access.organizationId}`);
    }
  } else {
    filterParts.push(`client_profile_id.eq.${access.profile.id}`);
  }

  const query = supabase
    .schema('portal')
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .order('occurs_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filterParts.length > 0) {
    query.or(filterParts.join(','));
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  if (!options.includeCompleted) {
    query.neq('status', 'completed');
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load scoped appointments', { userId: access.userId, options, error });
    throw new Error('Unable to load appointments.');
  }

  const records = (data ?? []) as AppointmentWithRelations[];
  return splitAppointments(records);
}
