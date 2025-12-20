'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';

const DONATION_CATALOG_PATH = '/ops/fundraising';
const INTEGRATIONS_PATH = '/ops/admin/integrations';

type AdminContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  donationsClient: ReturnType<Awaited<ReturnType<typeof createSupabaseServerClient>>['schema']>;
  actorProfileId: string;
};

function revalidateDonationCatalog(inventoryItemId?: string | null) {
  revalidatePath(DONATION_CATALOG_PATH);
  if (inventoryItemId) {
    revalidatePath(`/ops/fundraising/items/${inventoryItemId}`);
  }
}

function revalidateFundraisingActivity() {
  revalidatePath(DONATION_CATALOG_PATH);
}

function normalizeSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || `donation-${Date.now()}`
  );
}

function uniqStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

async function requirePortalAdmin(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.iharcRoles.includes('iharc_admin')) {
    throw new Error('IHARC admin access is required.');
  }

  return {
    supabase,
    donationsClient: supabase.schema('donations'),
    actorProfileId: access.profile.id,
  };
}

export async function saveCatalogItem(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();

  const id = (formData.get('id') as string | null)?.trim() || null;
  const slugInput = (formData.get('slug') as string | null)?.trim() ?? '';
  const shortDescriptionInput = (formData.get('short_description') as string | null)?.trim() || null;
  const longDescription = (formData.get('long_description') as string | null)?.trim() || null;
  const inventoryItemId = (formData.get('inventory_item_id') as string | null)?.trim() || null;
  if (!inventoryItemId) {
    throw new Error('Select an inventory item to link.');
  }

  const categoryIds = uniqStrings(formData.getAll('category_ids').map((value) => String(value)));

  const currency = ((formData.get('currency') as string | null)?.trim() || 'CAD').toUpperCase();
  if (!['CAD', 'USD'].includes(currency)) {
    throw new Error('Currency must be CAD or USD.');
  }

  const defaultQuantityRaw = String(formData.get('default_quantity') ?? '').trim();
  const defaultQuantity = defaultQuantityRaw.length === 0 ? 1 : Number.parseInt(defaultQuantityRaw, 10);
  if (!Number.isFinite(defaultQuantity) || defaultQuantity < 1) {
    throw new Error('Default quantity must be at least 1.');
  }

  const priorityRaw = String(formData.get('priority') ?? '').trim();
  const priority = priorityRaw.length === 0 ? 100 : Number.parseInt(priorityRaw, 10);
  if (!Number.isFinite(priority) || priority < 1) {
    throw new Error('Priority must be a positive whole number.');
  }

  const targetBufferRaw = String(formData.get('target_buffer') ?? '').trim();
  const targetBuffer = targetBufferRaw.length === 0 ? null : Number.parseInt(targetBufferRaw, 10);
  if (targetBuffer !== null && (!Number.isFinite(targetBuffer) || targetBuffer < 0)) {
    throw new Error('Target buffer must be a non-negative whole number.');
  }

  const imageUrlInput = (formData.get('image_url') as string | null)?.trim() || null;
  const imageUrl = imageUrlInput
    ? (() => {
        let url: URL;
        try {
          url = new URL(imageUrlInput);
        } catch {
          throw new Error('Image URL must be a valid absolute URL.');
        }
        if (url.protocol !== 'https:') {
          throw new Error('Image URL must start with https://');
        }
        return url.toString();
      })()
    : null;
  const shouldBeActive = formData.get('is_active') === 'on';

  if (shouldBeActive) {
    if (!id) {
      throw new Error('Sync a Stripe price before activating.');
    }

    if (categoryIds.length === 0) {
      throw new Error('Select at least one public category before activating.');
    }

    const { data: categoryRows, error: categoryError } = await donationsClient
      .from('catalog_categories')
      .select('id, is_active, is_public')
      .in('id', categoryIds);
    if (categoryError) throw categoryError;
    const categories = (categoryRows ?? []) as { id: string; is_active: boolean | null; is_public: boolean | null }[];

    if (categories.some((category) => category.is_public === false)) {
      throw new Error('Remove non-public categories before activating.');
    }

    const activePublic = categories.filter((category) => category.is_active !== false && category.is_public !== false);
    if (activePublic.length === 0) {
      throw new Error('Select at least one active public category before activating.');
    }

    const { data: inventoryRow, error: inventoryError } = await supabase
      .schema('core')
      .from('items')
      .select('cost_per_unit')
      .eq('id', inventoryItemId)
      .maybeSingle();
    if (inventoryError) throw inventoryError;
    const cost = inventoryRow?.cost_per_unit === null || inventoryRow?.cost_per_unit === undefined
      ? null
      : Number.parseFloat(String(inventoryRow.cost_per_unit));
    if (cost === null || !Number.isFinite(cost)) {
      throw new Error('Set a typical unit cost on the inventory item before activating.');
    }

    const { data: stripeRow, error: stripeError } = await donationsClient
      .from('catalog_items')
      .select('stripe_price_id')
      .eq('id', id)
      .maybeSingle();
    if (stripeError) throw stripeError;
    if (!stripeRow?.stripe_price_id) {
      throw new Error('Sync a Stripe price before activating.');
    }
  }

  const slug = slugInput;

  const { data: catalogItemId, error: upsertError } = await donationsClient.rpc('admin_upsert_catalog_item', {
    p_inventory_item_id: inventoryItemId,
    p_slug: slug,
    p_short_description: shortDescriptionInput,
    p_long_description: longDescription,
    p_currency: currency,
    p_default_quantity: defaultQuantity,
    p_priority: priority,
    p_target_buffer: targetBuffer,
    p_image_url: imageUrl,
    p_category_ids: categoryIds,
    p_should_be_active: shouldBeActive,
    p_id: id,
  });

  if (upsertError) throw upsertError;
  if (!catalogItemId) throw new Error('Unable to save catalogue item.');

  await logAuditEvent(supabase, {
    actorProfileId,
    action: id ? 'donation_catalog_updated' : 'donation_catalog_created',
    entityType: 'donation_catalog_item',
    entityRef: buildEntityRef({ schema: 'donations', table: 'catalog_items', id: String(catalogItemId) }),
    meta: { pk_uuid: String(catalogItemId), slug, inventory_item_id: inventoryItemId, category_ids: categoryIds, is_active: shouldBeActive },
  });

  revalidateDonationCatalog(inventoryItemId);
}

export async function removeCatalogItemAction(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();

  const inventoryItemId = (formData.get('inventory_item_id') as string | null)?.trim() || null;
  if (!inventoryItemId) {
    throw new Error('Missing inventory item id.');
  }

  const { data: existing, error: existingError } = await donationsClient
    .from('catalog_items')
    .select('id')
    .eq('inventory_item_id', inventoryItemId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing?.id) {
    throw new Error('Donation catalogue listing not found.');
  }

  const catalogItemId = String(existing.id);

  const { error: deleteAssignmentsError } = await donationsClient
    .from('catalog_item_categories')
    .delete()
    .eq('catalog_item_id', catalogItemId);
  if (deleteAssignmentsError) throw deleteAssignmentsError;

  const { error: deleteItemError } = await donationsClient
    .from('catalog_items')
    .delete()
    .eq('id', catalogItemId);
  if (deleteItemError) throw deleteItemError;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_catalog_removed',
    entityType: 'donation_catalog_item',
    entityRef: buildEntityRef({ schema: 'donations', table: 'catalog_items', id: catalogItemId }),
    meta: { pk_uuid: catalogItemId, inventory_item_id: inventoryItemId },
  });

  revalidateDonationCatalog(inventoryItemId);
}

export async function createCatalogCategory(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();

  const label = String(formData.get('label') ?? '').trim();
  if (!label) throw new Error('Category label is required.');

  const slugInput = String(formData.get('slug') ?? '').trim();
  const slug = normalizeSlug(slugInput || label);

  const sortOrderRaw = String(formData.get('sort_order') ?? '').trim();
  const sortOrder = sortOrderRaw.length === 0 ? 100 : Number.parseInt(sortOrderRaw, 10);
  if (!Number.isFinite(sortOrder) || sortOrder < 0) throw new Error('Sort order must be a non-negative whole number.');

  const isPublic = formData.getAll('is_public').includes('on');
  const isActive = formData.getAll('is_active').includes('on');

  const { data, error } = await donationsClient
    .from('catalog_categories')
    .insert({ slug, label, sort_order: sortOrder, is_public: isPublic, is_active: isActive })
    .select('id')
    .maybeSingle();
  if (error) throw error;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_catalog_category_created',
    entityType: 'donation_catalog_category',
    entityRef: buildEntityRef({ schema: 'donations', table: 'catalog_categories', id: data?.id ?? null }),
    meta: { pk_uuid: data?.id ?? null, slug, label, is_public: isPublic, is_active: isActive, sort_order: sortOrder },
  });

  revalidateDonationCatalog(null);
}

export async function updateCatalogCategory(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();

  const id = String(formData.get('id') ?? '').trim();
  if (!id) throw new Error('Missing category id.');

  const label = String(formData.get('label') ?? '').trim();
  if (!label) throw new Error('Category label is required.');

  const slugInput = String(formData.get('slug') ?? '').trim();
  const slug = normalizeSlug(slugInput || label);

  const sortOrderRaw = String(formData.get('sort_order') ?? '').trim();
  const sortOrder = sortOrderRaw.length === 0 ? 100 : Number.parseInt(sortOrderRaw, 10);
  if (!Number.isFinite(sortOrder) || sortOrder < 0) throw new Error('Sort order must be a non-negative whole number.');

  const isPublic = formData.getAll('is_public').includes('on');
  const isActive = formData.getAll('is_active').includes('on');

  const { error } = await donationsClient
    .from('catalog_categories')
    .update({ slug, label, sort_order: sortOrder, is_public: isPublic, is_active: isActive })
    .eq('id', id);
  if (error) throw error;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_catalog_category_updated',
    entityType: 'donation_catalog_category',
    entityRef: buildEntityRef({ schema: 'donations', table: 'catalog_categories', id }),
    meta: { pk_uuid: id, slug, label, is_public: isPublic, is_active: isActive, sort_order: sortOrder },
  });

  revalidateDonationCatalog(null);
}

export async function syncCatalogItemStripeAction(formData: FormData) {
  const { supabase, actorProfileId, donationsClient } = await requirePortalAdmin();
  const catalogItemId = (formData.get('catalog_item_id') as string | null)?.trim();
  if (!catalogItemId) {
    throw new Error('Missing catalogue item id.');
  }

  const response = await supabase.functions.invoke('donations_admin_sync_catalog_item_stripe', {
    body: { catalogItemId },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Unable to sync Stripe price.');
  }

  const stripeProductId = (response.data as { stripeProductId?: unknown } | null)?.stripeProductId;
  const stripePriceId = (response.data as { stripePriceId?: unknown } | null)?.stripePriceId;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_catalog_stripe_synced',
    entityType: 'donation_catalog_item',
    entityRef: buildEntityRef({ schema: 'donations', table: 'catalog_items', id: catalogItemId }),
    meta: { pk_uuid: catalogItemId, stripe_product_id: stripeProductId ?? null, stripe_price_id: stripePriceId ?? null },
  });

  const { data: inventoryRow, error: inventoryError } = await donationsClient
    .from('catalog_items')
    .select('inventory_item_id')
    .eq('id', catalogItemId)
    .maybeSingle();
  if (inventoryError) throw inventoryError;
  const inventoryItemId = typeof inventoryRow?.inventory_item_id === 'string' ? inventoryRow.inventory_item_id : null;
  revalidateDonationCatalog(inventoryItemId);
}

export async function cancelDonationSubscriptionAction(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();
  const stripeSubscriptionId = (formData.get('stripe_subscription_id') as string | null)?.trim();
  if (!stripeSubscriptionId) {
    throw new Error('Missing Stripe subscription id.');
  }

  const response = await supabase.functions.invoke('donations_admin_cancel_subscription', {
    body: { stripeSubscriptionId },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Unable to cancel subscription.');
  }

  const { data: subscriptionRow, error: subscriptionError } = await donationsClient
    .from('donation_subscriptions')
    .select('id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();
  if (subscriptionError) throw subscriptionError;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_subscription_canceled_admin',
    entityType: 'donation_subscription',
    entityRef: buildEntityRef({ schema: 'donations', table: 'donation_subscriptions', id: subscriptionRow?.id ?? null }),
    meta: { stripe_subscription_id: stripeSubscriptionId },
  });

  revalidateFundraisingActivity();
}

export async function resendDonationManageLinkAction(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();
  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Provide a valid email.');
  }

  const response = await supabase.functions.invoke('donations_admin_resend_manage_link', {
    body: { email },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Unable to send manage link.');
  }

  const { data: donorRow, error: donorError } = await donationsClient.from('donors').select('id').eq('email', email).maybeSingle();
  if (donorError) throw donorError;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_manage_link_resent_admin',
    entityType: 'donor',
    entityRef: buildEntityRef({ schema: 'donations', table: 'donors', id: donorRow?.id ?? null }),
    meta: { email },
  });

  revalidateFundraisingActivity();
}

export async function reprocessStripeWebhookEventAction(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();
  const stripeEventId = (formData.get('stripe_event_id') as string | null)?.trim();
  if (!stripeEventId) {
    throw new Error('Missing Stripe event id.');
  }

  const response = await supabase.functions.invoke('donations_admin_reprocess_webhook_event', {
    body: { stripeEventId },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Unable to reprocess webhook event.');
  }

  const { data: eventRow, error: eventError } = await donationsClient
    .from('stripe_webhook_events')
    .select('id')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle();
  if (eventError) throw eventError;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_webhook_reprocessed_admin',
    entityType: 'stripe_webhook_event',
    entityRef: buildEntityRef({ schema: 'donations', table: 'stripe_webhook_events', id: eventRow?.id ?? null }),
    meta: { stripe_event_id: stripeEventId },
  });

  revalidateFundraisingActivity();
  revalidatePath(INTEGRATIONS_PATH);
}

export async function upsertStripeDonationsCredentialsAction(formData: FormData) {
  const { supabase, actorProfileId } = await requirePortalAdmin();

  const mode = (formData.get('mode') as string | null)?.trim().toLowerCase();
  if (mode !== 'test' && mode !== 'live') {
    throw new Error('Select test or live mode.');
  }

  const secretKey = (formData.get('stripe_secret_key') as string | null)?.trim() ?? '';
  const webhookSecret = (formData.get('stripe_webhook_secret') as string | null)?.trim() ?? '';

  const { error } = await supabase.schema('donations').rpc('donations_admin_upsert_stripe_credentials', {
    p_actor_profile_id: actorProfileId,
    p_mode: mode,
    p_stripe_secret_key: secretKey,
    p_stripe_webhook_secret: webhookSecret,
  });

  if (error) {
    throw new Error(error.message || 'Unable to update Stripe credentials.');
  }

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donations_stripe_credentials_updated',
    entityType: 'donations_stripe_config',
    entityRef: buildEntityRef({ schema: 'portal', table: 'public_settings', id: `stripe_donations:${mode}` }),
    meta: { mode },
  });

  revalidatePath(INTEGRATIONS_PATH);
}

export async function setStripeDonationsModeAction(formData: FormData) {
  const { supabase, actorProfileId } = await requirePortalAdmin();

  const mode = (formData.get('mode') as string | null)?.trim().toLowerCase();
  if (mode !== 'test' && mode !== 'live') {
    throw new Error('Select test or live mode.');
  }

  const { error } = await supabase.schema('donations').rpc('donations_admin_set_stripe_mode', {
    p_actor_profile_id: actorProfileId,
    p_mode: mode,
  });

  if (error) {
    throw new Error(error.message || 'Unable to switch Stripe mode.');
  }

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donations_stripe_mode_updated',
    entityType: 'donations_stripe_config',
    entityRef: buildEntityRef({ schema: 'portal', table: 'public_settings', id: 'stripe_donations_mode' }),
    meta: { mode },
  });

  revalidatePath(INTEGRATIONS_PATH);
}

export async function upsertDonationsEmailCredentialsAction(formData: FormData) {
  const { supabase, actorProfileId } = await requirePortalAdmin();

  const emailFrom = (formData.get('email_from') as string | null)?.trim() ?? '';
  if (!emailFrom || !emailFrom.includes('@')) {
    throw new Error('From address must be a valid email.');
  }

  const sendgridApiKey = (formData.get('sendgrid_api_key') as string | null)?.trim() ?? '';
  if (!sendgridApiKey) {
    throw new Error('SendGrid API key is required.');
  }

  const { error } = await supabase.schema('donations').rpc('donations_admin_upsert_email_credentials', {
    p_actor_profile_id: actorProfileId,
    p_email_from: emailFrom,
    p_sendgrid_api_key: sendgridApiKey,
  });

  if (error) {
    throw new Error(error.message || 'Unable to update donations email configuration.');
  }

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donations_email_config_updated',
    entityType: 'donations_email_config',
    entityRef: buildEntityRef({ schema: 'portal', table: 'public_settings', id: 'donations_email_config' }),
    meta: { email_from: emailFrom, provider: 'sendgrid' },
  });

  revalidatePath(INTEGRATIONS_PATH);
}
