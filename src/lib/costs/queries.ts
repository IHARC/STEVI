import type { SupabaseRSCClient, SupabaseServerClient } from '@/lib/supabase/types';
import type { Database } from '@/types/supabase';

export type CostCategory = Database['core']['Tables']['cost_categories']['Row'];
export type CostDimension = Database['core']['Tables']['cost_dimensions']['Row'];
export type StaffRate = Database['core']['Tables']['staff_rates']['Row'];
export type ServiceCatalogEntry = Database['core']['Tables']['service_catalog']['Row'];
export type CostEventRow = Database['core']['Tables']['cost_events']['Row'];

export type CostEventWithCategory = CostEventRow & {
  cost_categories?: { name: string | null } | null;
};

type SupabaseClient = SupabaseRSCClient | SupabaseServerClient;

const COST_EVENT_SELECT = `
  id,
  person_id,
  organization_id,
  source_type,
  source_id,
  occurred_at,
  cost_amount,
  currency,
  quantity,
  unit_cost,
  uom,
  cost_category_id,
  metadata,
  cost_categories ( name )
`;

export async function fetchCostCategories(supabase: SupabaseClient): Promise<CostCategory[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('cost_categories')
    .select('*')
    .order('name');

  if (error) {
    throw new Error('Unable to load cost categories.');
  }

  return (data ?? []) as CostCategory[];
}

export async function fetchCostDimensions(supabase: SupabaseClient): Promise<CostDimension[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('cost_dimensions')
    .select('*')
    .order('dimension_type')
    .order('name');

  if (error) {
    throw new Error('Unable to load cost dimensions.');
  }

  return (data ?? []) as CostDimension[];
}

export async function fetchStaffRates(supabase: SupabaseClient, orgId: number): Promise<StaffRate[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('staff_rates')
    .select('*')
    .eq('org_id', orgId)
    .order('role_name')
    .order('effective_from', { ascending: false });

  if (error) {
    throw new Error('Unable to load staff rates.');
  }

  return (data ?? []) as StaffRate[];
}

export async function fetchServiceCatalog(supabase: SupabaseClient): Promise<ServiceCatalogEntry[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('service_catalog')
    .select('*')
    .order('service_code');

  if (error) {
    throw new Error('Unable to load the service catalog.');
  }

  return (data ?? []) as ServiceCatalogEntry[];
}

export async function fetchPersonCostEvents(
  supabase: SupabaseClient,
  personId: number,
  limit = 100,
): Promise<CostEventWithCategory[]> {
  const { data, error } = await supabase
    .schema('core')
    .from('cost_events')
    .select(COST_EVENT_SELECT)
    .eq('person_id', personId)
    .order('occurred_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error('Unable to load cost events for this client.');
  }

  return (data ?? []) as CostEventWithCategory[];
}

export async function fetchPersonCostRollups(supabase: SupabaseClient, personId: number) {
  const { data, error } = await supabase
    .schema('analytics')
    .from('person_cost_rollups_secure')
    .select('*')
    .eq('person_id', personId);

  if (error) {
    throw new Error('Unable to load cost rollups for this client.');
  }

  return data ?? [];
}

export async function fetchOrgCostRollups(supabase: SupabaseClient, orgId: number) {
  const { data, error } = await supabase
    .schema('analytics')
    .from('org_cost_rollups_secure')
    .select('*')
    .eq('organization_id', orgId)
    .order('cost_category_id', { ascending: true });

  if (error) {
    throw new Error('Unable to load organization cost rollups.');
  }

  return data ?? [];
}

export async function fetchOrgCostDaily(supabase: SupabaseClient, orgId: number, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .schema('analytics')
    .from('cost_event_daily_secure')
    .select('*')
    .eq('organization_id', orgId)
    .gte('day', sinceDate)
    .order('day', { ascending: true });

  if (error) {
    throw new Error('Unable to load cost activity trend.');
  }

  return data ?? [];
}

export async function resolveCostCategoryIdByName(
  supabase: SupabaseClient,
  categoryName: string,
): Promise<string> {
  const { data, error } = await supabase
    .schema('core')
    .from('cost_categories')
    .select('id')
    .eq('name', categoryName)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to resolve cost category.');
  }

  if (!data?.id) {
    throw new Error(`Cost category "${categoryName}" is not configured.`);
  }

  return data.id;
}

export async function resolveStaffRate(
  supabase: SupabaseClient,
  orgId: number,
  roleName: string,
  occurredAt: string,
): Promise<StaffRate> {
  const occurredDate = occurredAt.slice(0, 10);

  const { data, error } = await supabase
    .schema('core')
    .from('staff_rates')
    .select('*')
    .eq('org_id', orgId)
    .eq('role_name', roleName)
    .lte('effective_from', occurredDate)
    .or(`effective_to.is.null,effective_to.gte.${occurredDate}`)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to resolve staff rate for this role.');
  }

  if (!data) {
    throw new Error(`No staff rate configured for ${roleName}.`);
  }

  return data as StaffRate;
}

export async function resolveServiceCatalogEntry(
  supabase: SupabaseClient,
  serviceCode: string,
): Promise<ServiceCatalogEntry> {
  const { data, error } = await supabase
    .schema('core')
    .from('service_catalog')
    .select('*')
    .eq('service_code', serviceCode)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to resolve service catalog entry.');
  }

  if (!data) {
    throw new Error(`Service code ${serviceCode} is not configured.`);
  }

  return data as ServiceCatalogEntry;
}
