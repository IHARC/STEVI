'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { sanitizeResourceHtml } from '@/lib/sanitize-resource-html';
import { ensurePortalProfile } from '@/lib/profile';
import { normalizePolicySlug, type PolicyCategory, type PolicyStatus } from '@/lib/policies';
import { loadPortalAccess } from '@/lib/portal-access';
import { getPolicyCategories, getPolicyStatuses } from '@/lib/enum-values';
import type { SupabaseServerClient } from '@/lib/supabase/types';

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

async function parseStatus(supabase: SupabaseServerClient, value: string | null): Promise<PolicyStatus> {
  const allowed = await getPolicyStatuses(supabase);
  if (value && allowed.includes(value)) return value as PolicyStatus;
  return (allowed[0] as PolicyStatus) ?? 'draft';
}

async function parseCategory(
  supabase: SupabaseServerClient,
  value: string | null,
): Promise<PolicyCategory> {
  const allowed = await getPolicyCategories(supabase);
  if (value && allowed.includes(value)) return value as PolicyCategory;
  return (allowed[0] as PolicyCategory) ?? 'governance';
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

  const category = await parseCategory(supa, (formData.get('category') as string | null)?.trim() ?? null);
  const status = await parseStatus(supa, (formData.get('status') as string | null)?.trim() ?? 'draft');

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
    entityRef: buildEntityRef({ schema: 'portal', table: 'policies', id: inserted?.id ?? null }),
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

  const category = await parseCategory(supa, (formData.get('category') as string | null)?.trim() ?? null);
  const status = await parseStatus(supa, (formData.get('status') as string | null)?.trim() ?? 'draft');

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
    entityRef: buildEntityRef({ schema: 'portal', table: 'policies', id: policyId }),
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

export async function autosavePolicyAction(formData: FormData) {
  try {
    const { supabase, portalClient, actorProfile } = await requireAdminContext();
    const policyId = formData.get('policy_id') as string | null;
    if (!policyId) {
      throw new Error('Policy context is required.');
    }

    const bodyHtmlRaw = (formData.get('body_html') as string | null) ?? '';
    const summaryRaw = (formData.get('short_summary') as string | null) ?? '';
    const bodyHtml = sanitizeResourceHtml(bodyHtmlRaw);

    const { error } = await portalClient
      .from('policies')
      .update({
        body_html: bodyHtml,
        short_summary: summaryRaw.trim() || null,
        updated_by_profile_id: actorProfile.id,
      })
      .eq('id', policyId);

    if (error) {
      throw error;
    }

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'policy_autosaved',
      entityType: 'policy',
      entityRef: buildEntityRef({ schema: 'portal', table: 'policies', id: policyId }),
      meta: { fields: ['body_html', 'short_summary'] },
    });

    return { success: true } as const;
  } catch (error) {
    console.error('autosavePolicyAction error', error);
    const message = error instanceof Error ? error.message : 'Unable to autosave right now.';
    return { success: false, error: message } as const;
  }
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
    entityRef: buildEntityRef({ schema: 'portal', table: 'policies', id: policyId }),
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
