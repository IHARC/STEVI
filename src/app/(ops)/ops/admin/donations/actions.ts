'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';

type AdminContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  donationsClient: ReturnType<Awaited<ReturnType<typeof createSupabaseServerClient>>['schema']>;
  actorProfileId: string;
  accessToken: string;
};

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

async function requirePortalAdmin(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.iharcRoles.includes('iharc_admin')) {
    throw new Error('IHARC admin access is required.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.access_token) {
    throw sessionError ?? new Error('Missing session token. Refresh and try again.');
  }

  return {
    supabase,
    donationsClient: supabase.schema('donations'),
    actorProfileId: access.profile.id,
    accessToken: sessionData.session.access_token,
  };
}

export async function saveCatalogItem(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();

  const id = (formData.get('id') as string | null)?.trim() || null;
  const rawTitle = (formData.get('title') as string | null)?.trim() ?? '';
  if (!rawTitle) {
    throw new Error('Add a title for this item.');
  }

  const slugInput = (formData.get('slug') as string | null)?.trim() ?? '';
  const slug = normalizeSlug(slugInput || rawTitle);
  const shortDescription = (formData.get('short_description') as string | null)?.trim() || null;
  const longDescription = (formData.get('long_description') as string | null)?.trim() || null;
  const category = (formData.get('category') as string | null)?.trim() || null;
  const inventoryItemId = (formData.get('inventory_item_id') as string | null)?.trim() || null;
  if (!inventoryItemId) {
    throw new Error('Select an inventory item to link.');
  }
  const unitCostInput = (formData.get('unit_cost') as string | null)?.trim() ?? '';
  const unitCostCents =
    unitCostInput.length === 0
      ? null
      : (() => {
          const parsed = Number.parseFloat(unitCostInput);
          if (!Number.isFinite(parsed) || parsed < 0) {
            throw new Error('Typical cost must be a valid, non-negative number.');
          }
          return Math.round(parsed * 100);
        })();

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
  const isActive = formData.get('is_active') === 'on';

  const payload = {
    slug,
    title: rawTitle,
    short_description: shortDescription,
    long_description: longDescription,
    category,
    inventory_item_id: inventoryItemId,
    unit_cost_cents: unitCostCents,
    currency,
    default_quantity: defaultQuantity,
    priority,
    target_buffer: targetBuffer,
    image_url: imageUrl,
    is_active: isActive,
  };

  const query = id ? donationsClient.from('catalog_items').update(payload).eq('id', id) : donationsClient.from('catalog_items').insert(payload);

  const { data, error: upsertError } = await query.select('id').maybeSingle();
  if (upsertError) {
    throw upsertError;
  }

  await logAuditEvent(supabase, {
    actorProfileId,
    action: id ? 'donation_catalog_updated' : 'donation_catalog_created',
    entityType: 'donation_catalog_item',
    entityRef: buildEntityRef({ schema: 'donations', table: 'catalog_items', id: data?.id ?? null }),
    meta: { pk_uuid: data?.id ?? null, slug, title: rawTitle },
  });

  await revalidatePath('/ops/admin/website/fundraising');
}

export async function toggleCatalogItem(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();
  const id = (formData.get('id') as string | null)?.trim();
  if (!id) {
    throw new Error('Missing catalogue item id.');
  }
  const nextState = (formData.get('next_state') as string | null) === 'activate';

  const { error } = await donationsClient.from('catalog_items').update({ is_active: nextState }).eq('id', id);
  if (error) throw error;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_catalog_status_changed',
    entityType: 'donation_catalog_item',
    entityRef: buildEntityRef({ schema: 'donations', table: 'catalog_items', id }),
    meta: { pk_uuid: id, is_active: nextState },
  });

  await revalidatePath('/ops/admin/website/fundraising');
}

export async function importInventoryItem(formData: FormData) {
  const { supabase, donationsClient, actorProfileId } = await requirePortalAdmin();
  const inventoryItemId = (formData.get('inventory_item_id') as string | null)?.trim();
  if (!inventoryItemId) {
    throw new Error('Select an inventory item to import.');
  }

  const { data: existing, error: existingError } = await donationsClient
    .from('catalog_items')
    .select('id')
    .eq('inventory_item_id', inventoryItemId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    throw new Error('This inventory item is already in the donation catalogue.');
  }

  const { data: inventoryRow, error: inventoryError } = await supabase
    .schema('inventory')
    .from('v_items_with_balances')
    .select('id, name, category, cost_per_unit, minimum_threshold')
    .eq('id', inventoryItemId)
    .maybeSingle();
  if (inventoryError) throw inventoryError;
  if (!inventoryRow) {
    throw new Error('Inventory item not found.');
  }

  const unitCost = Number.parseFloat(String(inventoryRow.cost_per_unit ?? '0'));
  const unitCostCents = Number.isFinite(unitCost) ? Math.max(0, Math.round(unitCost * 100)) : null;
  const targetBuffer =
    inventoryRow.minimum_threshold === null || inventoryRow.minimum_threshold === undefined
      ? null
      : Number.parseInt(String(inventoryRow.minimum_threshold), 10) || null;

  const title = String(inventoryRow.name ?? 'Donation item');
  const slug = normalizeSlug(title);
  const category = typeof inventoryRow.category === 'string' ? inventoryRow.category : null;

  const { data: inserted, error: insertError } = await donationsClient
    .from('catalog_items')
    .insert({
      inventory_item_id: inventoryItemId,
      title,
      slug,
      category,
      unit_cost_cents: unitCostCents,
      target_buffer: targetBuffer,
      default_quantity: 1,
      priority: 100,
      currency: 'CAD',
      is_active: true,
    })
    .select('id')
    .maybeSingle();
  if (insertError) throw insertError;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'donation_catalog_imported',
    entityType: 'donation_catalog_item',
    entityRef: buildEntityRef({ schema: 'donations', table: 'catalog_items', id: inserted?.id ?? null }),
    meta: { pk_uuid: inserted?.id ?? null, inventory_item_id: inventoryItemId, title },
  });

  await revalidatePath('/ops/admin/website/fundraising');
}

export async function syncCatalogItemStripeAction(formData: FormData) {
  const { supabase, actorProfileId, accessToken } = await requirePortalAdmin();
  const catalogItemId = (formData.get('catalog_item_id') as string | null)?.trim();
  if (!catalogItemId) {
    throw new Error('Missing catalogue item id.');
  }

  const response = await supabase.functions.invoke('donations_admin_sync_catalog_item_stripe', {
    body: { catalogItemId },
    headers: { Authorization: `Bearer ${accessToken}` },
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

  await revalidatePath('/ops/admin/website/fundraising');
}

export async function cancelDonationSubscriptionAction(formData: FormData) {
  const { supabase, donationsClient, actorProfileId, accessToken } = await requirePortalAdmin();
  const stripeSubscriptionId = (formData.get('stripe_subscription_id') as string | null)?.trim();
  if (!stripeSubscriptionId) {
    throw new Error('Missing Stripe subscription id.');
  }

  const response = await supabase.functions.invoke('donations_admin_cancel_subscription', {
    body: { stripeSubscriptionId },
    headers: { Authorization: `Bearer ${accessToken}` },
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

  await revalidatePath('/ops/admin/integrations/donations');
}

export async function resendDonationManageLinkAction(formData: FormData) {
  const { supabase, donationsClient, actorProfileId, accessToken } = await requirePortalAdmin();
  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Provide a valid email.');
  }

  const response = await supabase.functions.invoke('donations_admin_resend_manage_link', {
    body: { email },
    headers: { Authorization: `Bearer ${accessToken}` },
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

  await revalidatePath('/ops/admin/integrations/donations');
}

export async function reprocessStripeWebhookEventAction(formData: FormData) {
  const { supabase, donationsClient, actorProfileId, accessToken } = await requirePortalAdmin();
  const stripeEventId = (formData.get('stripe_event_id') as string | null)?.trim();
  if (!stripeEventId) {
    throw new Error('Missing Stripe event id.');
  }

  const response = await supabase.functions.invoke('donations_admin_reprocess_webhook_event', {
    body: { stripeEventId },
    headers: { Authorization: `Bearer ${accessToken}` },
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

  await revalidatePath('/ops/admin/integrations/donations');
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

  await revalidatePath('/ops/admin/integrations/donations');
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

  await revalidatePath('/ops/admin/integrations/donations');
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

  await revalidatePath('/ops/admin/integrations/donations');
}

