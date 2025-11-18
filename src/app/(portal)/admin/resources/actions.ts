'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';
import { RESOURCE_KIND_LABELS, normalizeResourceSlug, type Resource, type ResourceEmbedPlacement } from '@/lib/resources';
import { sanitizeResourceHtml } from '@/lib/sanitize-resource-html';
import { buildResourceEmbedPayload, parseResourceAttachmentsInput, parseResourceTagsInput } from './resource-utils';

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

export async function createResourcePage(formData: FormData) {
  const supa = await createSupabaseServerClient();
  const portalClient = supa.schema('portal');

  const actorProfileId = formData.get('actor_profile_id') as string | null;
  if (!actorProfileId) {
    throw new Error('Admin context is required.');
  }

  const {
    data: { user },
    error: userError,
  } = await supa.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Sign in to continue.');
  }

  const { data: actorProfile, error: actorProfileError } = await portalClient
    .from('profiles')
    .select('id, role, user_id')
    .eq('id', actorProfileId)
    .maybeSingle();

  if (actorProfileError || !actorProfile || actorProfile.user_id !== user.id || actorProfile.role !== 'admin') {
    throw new Error('Admin access is required to publish resources.');
  }

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
      created_by_profile_id: actorProfileId,
      updated_by_profile_id: actorProfileId,
    })
    .select('id, slug')
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  await logAuditEvent(supa, {
    actorProfileId,
    action: 'resource_page_created',
    entityType: 'resource_page',
    entityId: inserted?.id ?? null,
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
  const supa = await createSupabaseServerClient();
  const portalClient = supa.schema('portal');

  const actorProfileId = formData.get('actor_profile_id') as string | null;
  const resourceId = formData.get('resource_id') as string | null;
  const currentSlug = (formData.get('current_slug') as string | null)?.trim() ?? null;

  if (!actorProfileId || !resourceId) {
    throw new Error('Admin context is required.');
  }

  const {
    data: { user },
    error: userError,
  } = await supa.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Sign in to continue.');
  }

  const { data: actorProfile, error: actorProfileError } = await portalClient
    .from('profiles')
    .select('id, role, user_id')
    .eq('id', actorProfileId)
    .maybeSingle();

  if (actorProfileError || !actorProfile || actorProfile.user_id !== user.id || actorProfile.role !== 'admin') {
    throw new Error('Admin access is required to update resources.');
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
      updated_by_profile_id: actorProfileId,
    })
    .eq('id', resourceId);

  if (updateError) {
    throw updateError;
  }

  await logAuditEvent(supa, {
    actorProfileId,
    action: 'resource_page_updated',
    entityType: 'resource_page',
    entityId: resourceId,
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
  const supa = await createSupabaseServerClient();
  const portalClient = supa.schema('portal');

  const actorProfileId = formData.get('actor_profile_id') as string | null;
  const resourceId = formData.get('resource_id') as string | null;
  const resourceSlug = (formData.get('resource_slug') as string | null)?.trim() ?? null;

  if (!actorProfileId || !resourceId) {
    throw new Error('Admin context is required.');
  }

  const {
    data: { user },
    error: userError,
  } = await supa.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Sign in to continue.');
  }

  const { data: actorProfile, error: actorProfileError } = await portalClient
    .from('profiles')
    .select('id, role, user_id')
    .eq('id', actorProfileId)
    .maybeSingle();

  if (actorProfileError || !actorProfile || actorProfile.user_id !== user.id || actorProfile.role !== 'admin') {
    throw new Error('Admin access is required to remove resources.');
  }

  const { error: deleteError } = await portalClient.from('resource_pages').delete().eq('id', resourceId);
  if (deleteError) {
    throw deleteError;
  }

  await logAuditEvent(supa, {
    actorProfileId,
    action: 'resource_page_deleted',
    entityType: 'resource_page',
    entityId: resourceId,
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
