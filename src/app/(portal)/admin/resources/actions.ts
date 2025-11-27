'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { RESOURCE_KIND_LABELS, normalizeResourceSlug, type Resource, type ResourceEmbedPlacement } from '@/lib/resources';
import { sanitizeResourceHtml } from '@/lib/sanitize-resource-html';
import { buildResourceEmbedPayload, parseResourceAttachmentsInput, parseResourceTagsInput } from './resource-utils';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';

async function revalidatePaths(
  ...paths: Array<string | null | undefined>
): Promise<void> {
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

  if (!access.canManageResources) {
    throw new Error('Admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, portalClient: supabase.schema('portal'), actorProfile };
}

export async function createResourcePage(formData: FormData) {
  const { supabase: supa, portalClient, actorProfile } = await requireAdminContext();

  const title = (formData.get('title') as string | null)?.trim() ?? '';
  if (!title) {
    throw new Error('Add a resource title.');
  }

  const slugInput = (formData.get('slug') as string | null)?.trim() ?? '';
  let slug = normalizeResourceSlug(slugInput || title);
  if (!slug) {
    slug = `resource-${Date.now()}`;
  }

  const kindInput = (formData.get('kind') as string | null)?.trim() ?? '';
  if (!kindInput || !Object.hasOwn(RESOURCE_KIND_LABELS, kindInput)) {
    throw new Error('Select a valid resource type.');
  }
  const kind = kindInput as Resource['kind'];

  const datePublished = (formData.get('date_published') as string | null)?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePublished)) {
    throw new Error('Enter the publication date in YYYY-MM-DD format.');
  }

  const summary = (formData.get('summary') as string | null)?.trim() || null;
  const location = (formData.get('location') as string | null)?.trim() || null;
  const tags = parseResourceTagsInput((formData.get('tags') as string | null) ?? '');
  const attachments = parseResourceAttachmentsInput((formData.get('attachments') as string | null) ?? '');

  const embedPayload = buildResourceEmbedPayload({
    type: (formData.get('embed_type') as string | null) ?? 'none',
    url: (formData.get('embed_url') as string | null) ?? '',
    provider: (formData.get('embed_provider') as string | null) ?? 'youtube',
    label: (formData.get('embed_label') as string | null) ?? '',
    html: (formData.get('embed_html') as string | null) ?? '',
  });
  const embedPlacementInput = (formData.get('embed_placement') as string | null)?.trim() ?? 'above';
  const embedPlacement: ResourceEmbedPlacement = embedPlacementInput === 'below' ? 'below' : 'above';

  const bodyHtmlRaw = (formData.get('body_html') as string | null) ?? '';
  const bodyHtml = sanitizeResourceHtml(bodyHtmlRaw);
  const isPublished = formData.get('is_published') === 'on';

  const { data: inserted, error: insertError } = await portalClient
    .from('resource_pages')
    .insert({
      slug,
      title,
      kind,
      date_published: datePublished,
      summary,
      location,
      tags,
      attachments,
      embed: embedPayload,
      embed_placement: embedPlacement,
      body_html: bodyHtml,
      is_published: isPublished,
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
    action: 'resource_page_created',
    entityType: 'resource_page',
    entityRef: buildEntityRef({ schema: 'portal', table: 'resource_pages', id: inserted?.id ?? null }),
    meta: {
      slug,
      kind,
      is_published: isPublished,
      tags,
    },
  });

  const adminResourcePath = `/admin/resources/${slug}`;

  await revalidatePaths('/admin', '/admin/resources', adminResourcePath);
}

export async function updateResourcePage(formData: FormData) {
  const { supabase: supa, portalClient, actorProfile } = await requireAdminContext();

  const resourceId = formData.get('resource_id') as string | null;
  const currentSlug = (formData.get('current_slug') as string | null)?.trim() ?? null;

  if (!resourceId) {
    throw new Error('Admin context is required.');
  }

  const { data: existing, error: existingError } = await portalClient
    .from('resource_pages')
    .select('slug')
    .eq('id', resourceId)
    .maybeSingle();

  if (existingError || !existing) {
    throw existingError ?? new Error('Resource not found.');
  }

  const title = (formData.get('title') as string | null)?.trim() ?? '';
  if (!title) {
    throw new Error('Add a resource title.');
  }

  const slugInput = (formData.get('slug') as string | null)?.trim() ?? '';
  let slug = normalizeResourceSlug(slugInput || title);
  if (!slug) {
    slug = existing.slug;
  }

  const kindInput = (formData.get('kind') as string | null)?.trim() ?? '';
  if (!kindInput || !Object.hasOwn(RESOURCE_KIND_LABELS, kindInput)) {
    throw new Error('Select a valid resource type.');
  }
  const kind = kindInput as Resource['kind'];

  const datePublished = (formData.get('date_published') as string | null)?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePublished)) {
    throw new Error('Enter the publication date in YYYY-MM-DD format.');
  }

  const summary = (formData.get('summary') as string | null)?.trim() || null;
  const location = (formData.get('location') as string | null)?.trim() || null;
  const tags = parseResourceTagsInput((formData.get('tags') as string | null) ?? '');
  const attachments = parseResourceAttachmentsInput((formData.get('attachments') as string | null) ?? '');

  const embedPayload = buildResourceEmbedPayload({
    type: (formData.get('embed_type') as string | null) ?? 'none',
    url: (formData.get('embed_url') as string | null) ?? '',
    provider: (formData.get('embed_provider') as string | null) ?? 'youtube',
    label: (formData.get('embed_label') as string | null) ?? '',
    html: (formData.get('embed_html') as string | null) ?? '',
  });
  const embedPlacementInput = (formData.get('embed_placement') as string | null)?.trim() ?? 'above';
  const embedPlacement: ResourceEmbedPlacement = embedPlacementInput === 'below' ? 'below' : 'above';

  const bodyHtmlRaw = (formData.get('body_html') as string | null) ?? '';
  const bodyHtml = sanitizeResourceHtml(bodyHtmlRaw);
  const isPublished = formData.get('is_published') === 'on';

  const { error: updateError } = await portalClient
    .from('resource_pages')
    .update({
      slug,
      title,
      kind,
      date_published: datePublished,
      summary,
      location,
      tags,
      attachments,
      embed: embedPayload,
      embed_placement: embedPlacement,
      body_html: bodyHtml,
      is_published: isPublished,
      updated_by_profile_id: actorProfile.id,
    })
    .eq('id', resourceId);

  if (updateError) {
    throw updateError;
  }

  await logAuditEvent(supa, {
    actorProfileId: actorProfile.id,
    action: 'resource_page_updated',
    entityType: 'resource_page',
    entityRef: buildEntityRef({ schema: 'portal', table: 'resource_pages', id: resourceId }),
    meta: {
      slug,
      kind,
      is_published: isPublished,
      tags,
    },
  });

  const adminResourcePath = `/admin/resources/${slug}`;

  const legacySlugPath = currentSlug && currentSlug !== slug ? `/resources/${currentSlug}` : null;
  const legacyAdminPath = currentSlug && currentSlug !== slug ? `/admin/resources/${currentSlug}` : null;

  await revalidatePaths(
    '/admin',
    '/admin/resources',
    adminResourcePath,
    '/resources',
    `/resources/${slug}`,
    legacySlugPath,
    legacyAdminPath,
    '/sitemap.xml',
  );
}

export async function deleteResourcePage(formData: FormData) {
  const resourceId = formData.get('resource_id') as string | null;
  const resourceSlug = (formData.get('resource_slug') as string | null)?.trim() ?? null;

  if (!resourceId) {
    throw new Error('Admin context is required.');
  }

  const { supabase: supa, portalClient, actorProfile } = await requireAdminContext();

  const { error: deleteError } = await portalClient.from('resource_pages').delete().eq('id', resourceId);
  if (deleteError) {
    throw deleteError;
  }

  await logAuditEvent(supa, {
    actorProfileId: actorProfile.id,
    action: 'resource_page_deleted',
    entityType: 'resource_page',
    entityRef: buildEntityRef({ schema: 'portal', table: 'resource_pages', id: resourceId }),
    meta: {
      slug: resourceSlug,
    },
  });

  await revalidatePaths(
    '/admin',
    '/admin/resources',
    '/resources',
    resourceSlug ? `/resources/${resourceSlug}` : null,
    resourceSlug ? `/admin/resources/${resourceSlug}` : null,
    '/sitemap.xml',
  );
}
