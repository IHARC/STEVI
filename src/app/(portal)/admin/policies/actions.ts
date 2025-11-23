'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';
import { sanitizeResourceHtml } from '@/lib/sanitize-resource-html';
import { ensurePortalProfile } from '@/lib/profile';
import { normalizePolicySlug, type PolicyCategory, type PolicyStatus } from '@/lib/policies';
import { loadPortalAccess } from '@/lib/portal-access';

async function revalidatePaths(...paths: Array<string | null | undefined>): Promise<void> {
  const unique = Array.from(
    new Set(
      paths
        .filter((path): path is string => Boolean(path))
        .map((path) => path.trim())
        .filter(Boolean),
    ),
  );

  await Promise.all(unique.map((path) => revalidatePath(path)));
}

async function requireAdminContext() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.canManagePolicies) {
    throw new Error('Admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, portalClient: supabase.schema('portal'), actorProfile };
}

function parseStatus(value: string | null): PolicyStatus {
  if (value === 'published' || value === 'archived' || value === 'draft') {
    return value;
  }
  return 'draft';
}

function parseCategory(value: string | null): PolicyCategory {
  if (
    value === 'client_rights' ||
    value === 'safety' ||
    value === 'staff' ||
    value === 'governance' ||
    value === 'operations' ||
    value === 'finance'
  ) {
    return value;
  }
  return 'governance';
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('Dates must use YYYY-MM-DD format.');
  }
  return trimmed;
}

export async function createPolicy(formData: FormData) {
  const { supabase: supa, portalClient, actorProfile } = await requireAdminContext();

  const title = (formData.get('title') as string | null)?.trim() ?? '';
  if (!title) {
    throw new Error('Add a policy title.');
  }

  const slugInput = (formData.get('slug') as string | null)?.trim() ?? '';
  const slug = normalizePolicySlug(slugInput || title);

  const category = parseCategory((formData.get('category') as string | null)?.trim() ?? null);
  const status = parseStatus((formData.get('status') as string | null)?.trim() ?? 'draft');

  const shortSummary = (formData.get('short_summary') as string | null)?.trim() ?? '';
  if (!shortSummary) {
    throw new Error('Add a short summary.');
  }

  const bodyRaw = (formData.get('body_html') as string | null) ?? '';
  const bodyHtml = sanitizeResourceHtml(bodyRaw);

  const sortOrder = Number.parseInt((formData.get('sort_order') as string | null) ?? '100', 10) || 100;
  const lastReviewedAt = parseDate(formData.get('last_reviewed_at') as string | null) ?? new Date().toISOString();
  const effectiveFrom = parseDate(formData.get('effective_from') as string | null);
  const effectiveTo = parseDate(formData.get('effective_to') as string | null);
  const internalRef = (formData.get('internal_ref') as string | null)?.trim() || null;

  const { data: inserted, error: insertError } = await portalClient
    .from('policies')
    .insert({
      slug,
      title,
      category,
      short_summary: shortSummary,
      body_html: bodyHtml,
      status,
      sort_order: sortOrder,
      last_reviewed_at: lastReviewedAt,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      internal_ref: internalRef,
      created_by_profile_id: actorProfile.id,
      updated_by_profile_id: actorProfile.id,
    })
    .select('id, slug')
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  await logAuditEvent(supa, {
    actorProfileId: actorProfile.id,
    action: 'policy_created',
    entityType: 'policy',
    entityId: inserted?.id ?? null,
    meta: {
      slug,
      status,
      category,
    },
  });

  const adminPolicyPath = `/admin/policies/${slug}`;

  await revalidatePaths('/admin', '/admin/policies', adminPolicyPath, '/policies', `/policies/${slug}`, '/transparency', '/sitemap.xml');
}

export async function updatePolicy(formData: FormData) {
  const { supabase: supa, portalClient, actorProfile } = await requireAdminContext();

  const policyId = formData.get('policy_id') as string | null;
  const currentSlug = (formData.get('current_slug') as string | null)?.trim() ?? null;

  if (!policyId) {
    throw new Error('Admin context is required.');
  }

  const { data: existing, error: existingError } = await portalClient
    .from('policies')
    .select('slug')
    .eq('id', policyId)
    .maybeSingle();

  if (existingError || !existing) {
    throw existingError ?? new Error('Policy not found.');
  }

  const title = (formData.get('title') as string | null)?.trim() ?? '';
  if (!title) {
    throw new Error('Add a policy title.');
  }

  const slugInput = (formData.get('slug') as string | null)?.trim() ?? '';
  const slug = normalizePolicySlug(slugInput || title) || existing.slug;

  const category = parseCategory((formData.get('category') as string | null)?.trim() ?? null);
  const status = parseStatus((formData.get('status') as string | null)?.trim() ?? 'draft');

  const shortSummary = (formData.get('short_summary') as string | null)?.trim() ?? '';
  if (!shortSummary) {
    throw new Error('Add a short summary.');
  }

  const bodyRaw = (formData.get('body_html') as string | null) ?? '';
  const bodyHtml = sanitizeResourceHtml(bodyRaw);

  const sortOrder = Number.parseInt((formData.get('sort_order') as string | null) ?? '100', 10) || 100;
  const lastReviewedAt = parseDate(formData.get('last_reviewed_at') as string | null) ?? new Date().toISOString();
  const effectiveFrom = parseDate(formData.get('effective_from') as string | null);
  const effectiveTo = parseDate(formData.get('effective_to') as string | null);
  const internalRef = (formData.get('internal_ref') as string | null)?.trim() || null;

  const { error: updateError } = await portalClient
    .from('policies')
    .update({
      slug,
      title,
      category,
      short_summary: shortSummary,
      body_html: bodyHtml,
      status,
      sort_order: sortOrder,
      last_reviewed_at: lastReviewedAt,
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
      internal_ref: internalRef,
      updated_by_profile_id: actorProfile.id,
    })
    .eq('id', policyId);

  if (updateError) {
    throw updateError;
  }

  await logAuditEvent(supa, {
    actorProfileId: actorProfile.id,
    action: 'policy_updated',
    entityType: 'policy',
    entityId: policyId,
    meta: {
      slug,
      status,
      category,
    },
  });

  const adminPolicyPath = `/admin/policies/${slug}`;
  const legacyPolicyPath = currentSlug && currentSlug !== slug ? `/policies/${currentSlug}` : null;
  const legacyAdminPath = currentSlug && currentSlug !== slug ? `/admin/policies/${currentSlug}` : null;

  await revalidatePaths(
    '/admin',
    '/admin/policies',
    adminPolicyPath,
    '/policies',
    `/policies/${slug}`,
    legacyPolicyPath,
    legacyAdminPath,
    '/transparency',
    '/sitemap.xml',
  );
}

export async function deletePolicy(formData: FormData) {
  const policyId = formData.get('policy_id') as string | null;
  const policySlug = (formData.get('policy_slug') as string | null)?.trim() ?? null;

  if (!policyId) {
    throw new Error('Admin context is required.');
  }

  const { supabase: supa, portalClient, actorProfile } = await requireAdminContext();

  const { error: deleteError } = await portalClient.from('policies').delete().eq('id', policyId);
  if (deleteError) {
    throw deleteError;
  }

  await logAuditEvent(supa, {
    actorProfileId: actorProfile.id,
    action: 'policy_deleted',
    entityType: 'policy',
    entityId: policyId,
    meta: {
      slug: policySlug,
    },
  });

  await revalidatePaths(
    '/admin',
    '/admin/policies',
    '/policies',
    policySlug ? `/policies/${policySlug}` : null,
    policySlug ? `/admin/policies/${policySlug}` : null,
    '/transparency',
    '/sitemap.xml',
  );
}
