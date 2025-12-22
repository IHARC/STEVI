import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

// Simple in-memory cache per process to avoid duplicate round-trips for the same enum column.
const enumCache = new Map<string, Promise<string[]>>();

export type EnumSource = {
  schema: string;
  table: string;
  column: string;
  prefix?: string;
  domainEquals?: string;
};

function cacheKey(source: EnumSource) {
  const { schema, table, column, prefix, domainEquals } = source;
  return [schema, table, column, prefix ?? '', domainEquals ?? ''].join('::');
}

function normalizeValues(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      seen.add(value);
    }
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function formatEnumLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function toOptions(values: string[]) {
  return values.map((value) => ({ value, label: formatEnumLabel(value) }));
}

async function fetchDistinctValues(
  supabase: SupabaseAnyServerClient,
  source: EnumSource,
): Promise<string[]> {
  const key = cacheKey(source);
  const cached = enumCache.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const client = supabase.schema(source.schema);

    // Special case: permission-domain based filtering (used for inventory roles)
    if (source.table === 'role_permissions' && source.domainEquals) {
      const { data: perms, error: permError } = await client
        .from('permissions')
        .select('id')
        .eq('domain', source.domainEquals);
      if (permError) throw permError;
      const permIds = (perms ?? []).map((row: { id: string }) => row.id);
      if (permIds.length === 0) return [];
      const { data: rolePerms, error: rolePermError } = await client
        .from('role_permissions')
        .select('role_id')
        .in('permission_id', permIds);
      if (rolePermError) throw rolePermError;
      const roleIds = (rolePerms ?? []).map((row: { role_id: string }) => row.role_id);
      if (roleIds.length === 0) return [];
      const { data: roles, error: rolesError } = await client
        .from('roles')
        .select('name')
        .in('id', roleIds);
      if (rolesError) throw rolesError;
      return normalizeValues((roles ?? []).map((row: { name: string }) => row.name));
    }

    let query = client.from(source.table).select(source.column, { distinct: true });
    if (source.prefix) {
      query = query.like(source.column, `${source.prefix}%`);
    }

    const { data, error } = await query.order(source.column, { ascending: true });
    if (error) {
      throw error;
    }

    const values = (data ?? []).map((row: Record<string, unknown>) => row[source.column] as string | null | undefined);
    return normalizeValues(values);
  })();

  enumCache.set(key, promise);
  return promise;
}

// Exposed helpers for specific enums
export const enumSources = {
  grantScopes: { schema: 'core', table: 'person_access_grants', column: 'scope' },
  affiliationStatuses: { schema: 'portal', table: 'profiles', column: 'affiliation_status' },
  affiliationTypes: { schema: 'portal', table: 'profiles', column: 'affiliation_type' },
  governmentRoleTypes: { schema: 'portal', table: 'profiles', column: 'government_role_type' },
  policyStatuses: { schema: 'portal', table: 'policies', column: 'status' },
  policyCategories: { schema: 'portal', table: 'policies', column: 'category' },
  resourceKinds: { schema: 'portal', table: 'resource_pages', column: 'kind' },
  resourceEmbedPlacement: { schema: 'portal', table: 'resource_pages', column: 'embed_placement' },
  livedExperienceStatuses: { schema: 'portal', table: 'profiles', column: 'homelessness_experience' },
  globalRoles: { schema: 'core', table: 'global_roles', column: 'name' },
  orgRoles: { schema: 'core', table: 'org_roles', column: 'name' },
} as const;

export async function getGrantScopes(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.grantScopes);
}

export async function getAffiliationStatuses(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.affiliationStatuses);
}

export async function getAffiliationTypes(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.affiliationTypes);
}

export async function getGovernmentRoleTypes(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.governmentRoleTypes);
}

export async function getPolicyStatuses(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.policyStatuses);
}

export async function getPolicyCategories(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.policyCategories);
}

export async function getResourceKinds(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.resourceKinds);
}

export async function getResourceEmbedPlacements(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.resourceEmbedPlacement);
}

export async function getLivedExperienceStatuses(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.livedExperienceStatuses);
}

export async function getGlobalRoles(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.globalRoles);
}

export async function getOrgRoleNames(supabase: SupabaseAnyServerClient): Promise<string[]> {
  return fetchDistinctValues(supabase, enumSources.orgRoles);
}
