import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { Database } from '@/types/supabase';
import { sanitizeResourceHtml } from '@/lib/sanitize-resource-html';

export const POLICY_CATEGORY_LABELS = {
  client_rights: 'Client rights',
  safety: 'Safety & risk',
  staff: 'Staff guidance',
  governance: 'Governance',
  operations: 'Operations',
  finance: 'Finance & procurement',
} as const;

export type PolicyCategory = keyof typeof POLICY_CATEGORY_LABELS;
export type PolicyStatus = Database['portal']['Enums']['policy_status'];

export type Policy = {
  id: string;
  slug: string;
  title: string;
  category: PolicyCategory;
  shortSummary: string;
  bodyHtml: string;
  status: PolicyStatus;
  isPublished: boolean;
  sortOrder: number;
  lastReviewedAt: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  internalRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PolicyListOptions = {
  includeUnpublished?: boolean;
};

const POLICY_SELECT = `
  id,
  slug,
  title,
  category,
  short_summary,
  body_html,
  status,
  is_published,
  sort_order,
  last_reviewed_at,
  effective_from,
  effective_to,
  internal_ref,
  created_at,
  updated_at
`;

export async function listPolicies(options: PolicyListOptions = {}): Promise<Policy[]> {
  const supabase = await createSupabaseRSCClient();
  const portal = supabase.schema('portal');

  let query = portal
    .from('policies')
    .select(POLICY_SELECT)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (!options.includeUnpublished) {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).map(mapPolicyRow);
}

export async function getPolicyBySlug(slug: string, options: PolicyListOptions = {}): Promise<Policy | null> {
  const supabase = await createSupabaseRSCClient();
  const portal = supabase.schema('portal');

  let query = portal
    .from('policies')
    .select(POLICY_SELECT)
    .eq('slug', slug)
    .limit(1);

  if (!options.includeUnpublished) {
    query = query.eq('status', 'published');
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  return data ? mapPolicyRow(data) : null;
}

export function normalizePolicySlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function mapPolicyRow(row: Database['portal']['Tables']['policies']['Row']): Policy {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category as PolicyCategory,
    shortSummary: row.short_summary,
    bodyHtml: sanitizeResourceHtml(row.body_html ?? ''),
    status: row.status as PolicyStatus,
    isPublished: Boolean(row.is_published),
    sortOrder: row.sort_order,
    lastReviewedAt: row.last_reviewed_at,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    internalRef: row.internal_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
