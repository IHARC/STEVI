import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { Database } from '@/types/supabase';
import type {
  CfsSource,
  CfsStatus,
  ReportPriority,
} from '@/lib/cfs/constants';

export type CfsCallRow = Database['case_mgmt']['Tables']['calls_for_service']['Row'];
export type CfsTimelineRow = Database['case_mgmt']['Tables']['cfs_timeline']['Row'];
export type CfsOrgAccessRow = Database['case_mgmt']['Tables']['cfs_org_access']['Row'];
export type CfsAttachmentRow = Database['case_mgmt']['Tables']['cfs_attachments']['Row'];
export type CfsQueueRow = Database['case_mgmt']['Views']['cfs_queue_view']['Row'];
export type CfsSlaRow = Database['case_mgmt']['Views']['cfs_sla_view']['Row'];
export type PublicTrackingRow = Database['case_mgmt']['Tables']['cfs_public_tracking']['Row'];
export type IncidentRow = Database['case_mgmt']['Tables']['incidents']['Row'];

export type CfsQueueFilters = {
  status?: CfsStatus | 'all';
  priority?: ReportPriority | 'all';
  source?: CfsSource | 'all';
  ownerScope?: 'all' | 'owned' | 'shared';
  organizationId?: number | null;
  limit?: number;
  search?: string | null;
};

const CFS_QUEUE_SELECT = `
  id,
  report_number,
  report_received_at,
  received_at,
  status,
  report_status,
  report_priority_assessment,
  priority_hint,
  type_hint,
  origin,
  source,
  report_method,
  location_text,
  reported_location,
  reported_coordinates,
  location_confidence,
  owning_organization_id,
  owning_organization_name,
  reporting_organization_id,
  reporting_organization_name,
  notify_opt_in,
  notify_channel,
  notify_target,
  public_tracking_enabled,
  public_tracking_id,
  created_at,
  updated_at,
  duplicate_of_report_id,
  converted_incident_id,
  escalated_to_incident_id
`;

export async function fetchCfsQueue(
  supabase: SupabaseAnyServerClient,
  filters: CfsQueueFilters = {},
): Promise<CfsQueueRow[]> {
  const limit = filters.limit ?? 200;
  let query = supabase
    .schema('case_mgmt')
    .from('cfs_queue_view')
    .select(CFS_QUEUE_SELECT)
    .order('report_received_at', { ascending: false })
    .limit(limit);

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.priority && filters.priority !== 'all') {
    query = query.eq('report_priority_assessment', filters.priority);
  }

  if (filters.source && filters.source !== 'all') {
    query = query.eq('source', filters.source);
  }

  if (filters.ownerScope === 'owned' && filters.organizationId) {
    query = query.eq('owning_organization_id', filters.organizationId);
  }

  if (filters.ownerScope === 'shared' && filters.organizationId) {
    query = query.neq('owning_organization_id', filters.organizationId);
  }

  if (filters.search) {
    const term = filters.search.trim();
    if (term) {
      query = query.or(`report_number.ilike.%${term}%,location_text.ilike.%${term}%`);
    }
  }

  const { data, error } = await query;
  if (error) {
    throw new Error('Unable to load the CFS queue right now.');
  }

  return (data ?? []) as CfsQueueRow[];
}

export async function fetchCfsCallById(
  supabase: SupabaseAnyServerClient,
  cfsId: number,
): Promise<CfsCallRow | null> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('calls_for_service')
    .select('*')
    .eq('id', cfsId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load the call for service.');
  }

  return (data as CfsCallRow | null) ?? null;
}

export async function fetchCfsTimeline(
  supabase: SupabaseAnyServerClient,
  cfsId: number,
): Promise<CfsTimelineRow[]> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('cfs_timeline')
    .select('id, incident_report_id, incident_id, phase, sub_phase, phase_started_at, phase_completed_at, phase_status, phase_notes, phase_data, performed_by, duration_seconds, sla_target_seconds, sla_met, created_at, created_by, organization_id')
    .eq('incident_report_id', cfsId)
    .order('phase_started_at', { ascending: false });

  if (error) {
    throw new Error('Unable to load the CFS timeline.');
  }

  return (data ?? []) as CfsTimelineRow[];
}

export async function fetchCfsOrgAccess(
  supabase: SupabaseAnyServerClient,
  cfsId: number,
): Promise<CfsOrgAccessRow[]> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('cfs_org_access')
    .select('id, organization_id, access_level, reason, granted_by, granted_at, revoked_at, revoked_by, is_active, updated_at')
    .eq('cfs_id', cfsId)
    .eq('is_active', true)
    .order('granted_at', { ascending: false });

  if (error) {
    throw new Error('Unable to load collaborating organizations.');
  }

  return (data ?? []) as CfsOrgAccessRow[];
}

export async function fetchCfsAttachments(
  supabase: SupabaseAnyServerClient,
  cfsId: number,
): Promise<CfsAttachmentRow[]> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('cfs_attachments')
    .select('id, cfs_id, organization_id, uploaded_by, file_name, file_type, file_size, storage_bucket, storage_path, metadata, created_at')
    .eq('cfs_id', cfsId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Unable to load attachments.');
  }

  return (data ?? []) as CfsAttachmentRow[];
}

export async function fetchCfsSlaRows(
  supabase: SupabaseAnyServerClient,
  organizationId: number | null,
  sinceIso?: string,
  limit = 500,
): Promise<CfsSlaRow[]> {
  let query = supabase
    .schema('case_mgmt')
    .from('cfs_sla_view')
    .select('*')
    .order('report_received_at', { ascending: false })
    .limit(limit);

  if (organizationId) {
    query = query.eq('owning_organization_id', organizationId);
  }

  if (sinceIso) {
    query = query.gte('report_received_at', sinceIso);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error('Unable to load CFS SLA metrics.');
  }

  return (data ?? []) as CfsSlaRow[];
}

export async function fetchIncidentById(
  supabase: SupabaseAnyServerClient,
  incidentId: number,
): Promise<IncidentRow | null> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('incidents')
    .select('*')
    .eq('id', incidentId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load the incident.');
  }

  return (data as IncidentRow | null) ?? null;
}

export async function fetchIncidentsList(
  supabase: SupabaseAnyServerClient,
  limit = 200,
): Promise<IncidentRow[]> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('incidents')
    .select('id, incident_number, incident_type, status, dispatch_priority, dispatch_at, location, created_at, incident_report_id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error('Unable to load incidents.');
  }

  return (data ?? []) as IncidentRow[];
}

export async function fetchIncidentByCfsId(
  supabase: SupabaseAnyServerClient,
  cfsId: number,
): Promise<IncidentRow | null> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('incidents')
    .select('*')
    .eq('incident_report_id', cfsId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load the incident.');
  }

  return (data as IncidentRow | null) ?? null;
}

export async function fetchCfsPublicTrackingByCfsId(
  supabase: SupabaseAnyServerClient,
  cfsId: number,
): Promise<PublicTrackingRow | null> {
  const { data, error } = await supabase
    .schema('case_mgmt')
    .from('cfs_public_tracking')
    .select('id, cfs_id, public_tracking_id, status_bucket, category, public_location_area, public_summary, last_updated_at, created_at, updated_at')
    .eq('cfs_id', cfsId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load public tracking details.');
  }

  return (data as PublicTrackingRow | null) ?? null;
}

export async function fetchOrganizationsForSharing(
  supabase: SupabaseAnyServerClient,
): Promise<Array<{ id: number; name: string | null; services_tags?: Database['core']['Tables']['organizations']['Row']['services_tags'] }>> {
  const { data, error } = await supabase
    .schema('core')
    .from('organizations')
    .select('id, name, services_tags, is_active')
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw new Error('Unable to load organizations.');
  }

  return (data ?? []) as Array<{ id: number; name: string | null; services_tags?: Database['core']['Tables']['organizations']['Row']['services_tags'] }>;
}

export async function fetchOrganizationById(
  supabase: SupabaseAnyServerClient,
  orgId: number | null,
): Promise<{ id: number; name: string | null } | null> {
  if (!orgId) return null;
  const { data, error } = await supabase
    .schema('core')
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load organization details.');
  }

  if (!data) return null;
  return { id: data.id as number, name: (data as { name: string | null }).name ?? null };
}

export async function fetchPublicTracking(
  supabase: SupabaseAnyServerClient,
  trackingId: string,
): Promise<Database['case_mgmt']['Functions']['cfs_public_tracking_get']['Returns'][number] | null> {
  const { data, error } = await supabase.schema('case_mgmt').rpc('cfs_public_tracking_get', {
    p_tracking_id: trackingId,
  });

  if (error) {
    throw new Error('Unable to load tracking details.');
  }

  if (!data || data.length === 0) return null;
  return data[0];
}
