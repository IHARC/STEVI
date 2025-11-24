import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { Database, Json } from '@/types/supabase';

type PortalProfile = Database['portal']['Tables']['profiles']['Row'];
type AffiliationStatus = Database['portal']['Enums']['affiliation_status'];
type AffiliationType = Database['portal']['Enums']['affiliation_type'];
type GovernmentRoleType = Database['portal']['Enums']['government_role_type'];

export type AdminUserSegment = 'all' | 'clients' | 'partners' | 'staff';

export type AdminUserFilters = {
  search?: string | null;
  status?: AffiliationStatus | null;
  organizationId?: number | null;
  role?: string | null;
  sort?: 'recent' | 'name';
  page?: number;
  pageSize?: number;
};

export type AdminUserListItem = {
  profileId: string;
  displayName: string;
  positionTitle: string | null;
  affiliationType: AffiliationType;
  affiliationStatus: AffiliationStatus;
  organizationId: number | null;
  organizationName: string | null;
  userId: string | null;
  email: string | null;
  lastSeenAt: string | null;
  roles: {
    portal: string[];
    iharc: string[];
  };
};

export type AdminUserListResult = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type AdminUserSummary = {
  total: number;
  clients: number;
  partners: number;
  staff: number;
  pending: number;
  revoked: number;
};

export type AdminUserDetail = {
  profile: PortalProfile;
  email: string | null;
  organization: { id: number; name: string; status: string | null } | null;
  roles: { portal: string[]; iharc: string[] };
  auditEvents: Array<{
    id: string;
    action: string;
    createdAt: string;
    actorProfileId: string | null;
    meta: Json;
  }>;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const PARTNER_AFFILIATIONS: AffiliationType[] = ['agency_partner', 'government_partner'];
const STAFF_ROLES = ['iharc_admin', 'iharc_supervisor', 'iharc_staff', 'iharc_volunteer'] as const;

function parsePageNumber(value: number | string | undefined, fallback = 1): number {
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return fallback;
}

function parsePageSize(value: number | string | undefined, fallback = DEFAULT_PAGE_SIZE): number {
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed, MAX_PAGE_SIZE);
    }
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.min(value, MAX_PAGE_SIZE);
  }
  return fallback;
}

function normalizeSearchTerm(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Escape % and _ to avoid unintended wildcard expansion.
  return trimmed.replace(/[%_]/g, (match) => `\\${match}`);
}

async function fetchUserIdsForRoles(
  supabase: SupabaseAnyServerClient,
  roleNames: string[],
): Promise<Set<string>> {
  if (roleNames.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .schema('core')
    .from('user_roles')
    .select('user_id, roles:roles!inner(name)')
    .in('roles.name', roleNames)
    .not('user_id', 'is', null);

  if (error) {
    throw error;
  }

  const ids = new Set<string>();
  (data ?? []).forEach((row: { user_id: string | null; roles: { name: string } | null }) => {
    if (row.user_id) {
      ids.add(row.user_id);
    }
  });
  return ids;
}

async function resolveRoleFilteredUserIds(
  supabase: SupabaseAnyServerClient,
  segment: AdminUserSegment,
  roleFilter: string | null,
): Promise<Set<string> | null> {
  const roleNames = [
    ...(segment === 'staff' ? Array.from(STAFF_ROLES) : []),
    ...(roleFilter ? [roleFilter] : []),
  ];

  if (roleNames.length === 0) {
    return null;
  }

  return fetchUserIdsForRoles(supabase, roleNames);
}

async function fetchRoleMap(
  supabase: SupabaseAnyServerClient,
  userIds: string[],
): Promise<Map<string, { portal: string[]; iharc: string[] }>> {
  const roleMap = new Map<string, { portal: string[]; iharc: string[] }>();
  if (userIds.length === 0) return roleMap;

  const { data, error } = await supabase
    .schema('core')
    .from('user_roles')
    .select('user_id, roles:roles!inner(name)')
    .in('user_id', userIds);

  if (error) {
    throw error;
  }

  (data ?? []).forEach((row: { user_id: string; roles: { name: string } | null }) => {
    const userId = row.user_id;
    const roleName = row.roles?.name;
    if (!roleName) return;
    const entry = roleMap.get(userId) ?? { portal: [], iharc: [] };
    if (roleName.startsWith('portal_')) {
      entry.portal.push(roleName);
    } else if (roleName.startsWith('iharc_')) {
      entry.iharc.push(roleName);
    }
    roleMap.set(userId, entry);
  });

  return roleMap;
}

async function fetchOrganizationMap(
  supabase: SupabaseAnyServerClient,
  organizationIds: number[],
): Promise<Map<number, { id: number; name: string; status: string | null }>> {
  const map = new Map<number, { id: number; name: string; status: string | null }>();
  if (organizationIds.length === 0) return map;

  const { data, error } = await supabase
    .schema('core')
    .from('organizations')
    .select('id, name, status')
    .in('id', organizationIds);

  if (error) {
    throw error;
  }

  (data ?? []).forEach((org: { id: number; name: string; status: string | null }) => {
    map.set(org.id, { id: org.id, name: org.name, status: org.status });
  });
  return map;
}

async function fetchEmailMap(
  supabase: SupabaseAnyServerClient,
  profiles: PortalProfile[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (profiles.length === 0) return map;

  await Promise.all(
    profiles.map(async (profile) => {
      try {
        const { data, error } = await supabase.rpc('portal_get_user_email', {
          p_profile_id: profile.id,
        });
        if (!error && data) {
          map.set(profile.id, data as string);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to fetch email for profile', profile.id, error);
        }
      }
    }),
  );

  return map;
}

export async function fetchAdminUsers(
  supabase: SupabaseAnyServerClient,
  segment: AdminUserSegment,
  filters: AdminUserFilters = {},
): Promise<AdminUserListResult> {
  const page = parsePageNumber(filters.page);
  const pageSize = parsePageSize(filters.pageSize);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const search = normalizeSearchTerm(filters.search ?? null);
  const roleFilter = filters.role ?? null;
  const roleUserIds = await resolveRoleFilteredUserIds(supabase, segment, roleFilter);
  if (roleUserIds && roleUserIds.size === 0) {
    return { items: [], page, pageSize, total: 0, hasMore: false };
  }

  const portal = supabase.schema('portal');

  let query = portal
    .from('profiles')
    .select(
      'id, user_id, display_name, position_title, affiliation_type, affiliation_status, organization_id, last_seen_at, updated_at',
      { count: 'exact' },
    );

  if (segment === 'clients') {
    query = query.eq('affiliation_type', 'community_member');
  } else if (segment === 'partners') {
    query = query.in('affiliation_type', PARTNER_AFFILIATIONS);
  }

  if (filters.status) {
    query = query.eq('affiliation_status', filters.status);
  }

  if (filters.organizationId) {
    query = query.eq('organization_id', filters.organizationId);
  }

  if (roleUserIds) {
    query = query.in('user_id', Array.from(roleUserIds));
  }

  if (search) {
    query = query.ilike('display_name', `%${search}%`);
  }

  const sortKey = filters.sort === 'name' ? 'display_name' : 'updated_at';
  query = query.order(sortKey, { ascending: filters.sort === 'name' }).range(from, to);

  const { data, error, count } = await query;
  if (error) {
    throw error;
  }

  const profiles = (data ?? []) as PortalProfile[];
  if (profiles.length === 0) {
    return { items: [], page, pageSize, total: count ?? 0, hasMore: false };
  }

  const organizationIds = Array.from(
    new Set(
      profiles
        .map((profile) => profile.organization_id)
        .filter((id): id is number => typeof id === 'number'),
    ),
  );
  const userIds = Array.from(
    new Set(
      profiles
        .map((profile) => profile.user_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  );

  const [orgMap, roleMap, emailMap] = await Promise.all([
    fetchOrganizationMap(supabase, organizationIds),
    fetchRoleMap(supabase, userIds),
    fetchEmailMap(supabase, profiles),
  ]);

  const items: AdminUserListItem[] = profiles.map((profile) => {
    const roles = roleMap.get(profile.user_id ?? '') ?? { portal: [], iharc: [] };
    const organization = profile.organization_id ? orgMap.get(profile.organization_id) : null;
    return {
      profileId: profile.id,
      displayName: profile.display_name,
      positionTitle: profile.position_title,
      affiliationType: profile.affiliation_type,
      affiliationStatus: profile.affiliation_status,
      organizationId: profile.organization_id,
      organizationName: organization?.name ?? null,
      userId: profile.user_id,
      email: emailMap.get(profile.id) ?? null,
      lastSeenAt: profile.last_seen_at,
      roles,
    };
  });

  const total = count ?? items.length;
  const hasMore = total > from + items.length;

  return { items, total, page, pageSize, hasMore };
}

export async function fetchAdminUserSummary(
  supabase: SupabaseAnyServerClient,
): Promise<AdminUserSummary> {
  const portal = supabase.schema('portal');

  const [all, clients, partners, pending, revoked, staffIds] = await Promise.all([
    portal.from('profiles').select('id', { count: 'exact', head: true }),
    portal
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('affiliation_type', 'community_member'),
    portal
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('affiliation_type', PARTNER_AFFILIATIONS),
    portal
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('affiliation_status', 'pending'),
    portal
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('affiliation_status', 'revoked'),
    fetchUserIdsForRoles(supabase, Array.from(STAFF_ROLES)),
  ]);

  return {
    total: all.count ?? 0,
    clients: clients.count ?? 0,
    partners: partners.count ?? 0,
    pending: pending.count ?? 0,
    revoked: revoked.count ?? 0,
    staff: staffIds.size,
  };
}

export async function fetchAdminUserDetail(
  supabase: SupabaseAnyServerClient,
  profileId: string,
): Promise<AdminUserDetail | null> {
  const portal = supabase.schema('portal');
  const { data: profile, error } = await portal
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile) {
    return null;
  }

  const organization = profile.organization_id
    ? await (async () => {
        const { data, error: orgError } = await supabase
          .schema('core')
          .from('organizations')
          .select('id, name, status')
          .eq('id', profile.organization_id)
          .maybeSingle();
        if (orgError) throw orgError;
        return data ?? null;
      })()
    : null;

  const userId = profile.user_id;
  const roleMap = userId ? await fetchRoleMap(supabase, [userId]) : new Map<string, { portal: string[]; iharc: string[] }>();
  const roles = userId ? roleMap.get(userId) ?? { portal: [], iharc: [] } : { portal: [], iharc: [] };

  const emailMap = await fetchEmailMap(supabase, [profile as PortalProfile]);
  const email = emailMap.get(profile.id) ?? null;

  const { data: auditRows, error: auditError } = await portal
    .from('audit_log')
    .select('id, action, created_at, actor_profile_id, entity_id, entity_type, meta')
    .eq('entity_id', profileId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (auditError) {
    throw auditError;
  }

  type AuditRow = {
    id: string;
    action: string;
    created_at: string;
    actor_profile_id: string | null;
    meta: Json;
  };

  const auditEvents =
    (auditRows ?? []).map((row: AuditRow) => ({
      id: row.id,
      action: row.action,
      createdAt: row.created_at,
      actorProfileId: row.actor_profile_id,
      meta: row.meta,
    })) ?? [];

  return {
    profile: profile as PortalProfile,
    organization: organization ? { id: organization.id, name: organization.name, status: organization.status } : null,
    roles,
    email,
    auditEvents,
  };
}

export function normalizeOrganizationId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseAffiliationType(value: string | null): AffiliationType | null {
  if (!value) return null;
  const allowed: AffiliationType[] = ['community_member', 'agency_partner', 'government_partner'];
  return allowed.includes(value as AffiliationType) ? (value as AffiliationType) : null;
}

export function parseAffiliationStatus(value: string | null): AffiliationStatus | null {
  if (!value) return null;
  const allowed: AffiliationStatus[] = ['approved', 'pending', 'revoked'];
  return allowed.includes(value as AffiliationStatus) ? (value as AffiliationStatus) : null;
}

export function parseGovernmentRole(value: string | null): GovernmentRoleType | null {
  if (!value) return null;
  const allowed: GovernmentRoleType[] = ['staff', 'politician'];
  return allowed.includes(value as GovernmentRoleType) ? (value as GovernmentRoleType) : null;
}

export function coerceSegment(value: string | null | undefined): AdminUserSegment {
  if (value === 'clients' || value === 'partners' || value === 'staff') return value;
  return 'all';
}

export function parsePageParam(raw: string | string[] | undefined): number {
  if (!raw) return 1;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}
