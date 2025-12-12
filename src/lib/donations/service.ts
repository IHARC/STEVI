import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { DonationCatalogItem, DonationCatalogMetrics } from './types';

const CATALOG_ITEM_SELECT =
  'id, slug, title, short_description, long_description, category, inventory_item_id, unit_cost_cents, currency, default_quantity, priority, target_buffer, image_url, stripe_product_id, stripe_price_id, is_active';
const CATALOG_METRICS_SELECT =
  'catalog_item_id, current_stock, target_buffer, distributed_last_30_days, distributed_last_365_days, inventory_item_name, inventory_item_category, unit_type';

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === 'bigint') return Number(value);
  return null;
}

function requireString(value: unknown, message: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  throw new Error(message);
}

function defaultMetrics(): DonationCatalogMetrics {
  return {
    currentStock: null,
    targetBuffer: null,
    distributedLast30Days: null,
    distributedLast365Days: null,
    inventoryItemName: null,
    inventoryItemCategory: null,
    inventoryUnitType: null,
  };
}

export async function fetchDonationCatalogAdmin(
  supabase: SupabaseAnyServerClient,
): Promise<DonationCatalogItem[]> {
  const donations = supabase.schema('donations');

  const [itemsResult, metricsResult] = await Promise.all([
    donations
      .from('catalog_items')
      .select(CATALOG_ITEM_SELECT)
      .order('priority', { ascending: true })
      .order('title', { ascending: true }),
    donations.from('catalog_item_metrics').select(CATALOG_METRICS_SELECT),
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (metricsResult.error) throw metricsResult.error;

  const metricsById = new Map<string, DonationCatalogMetrics>();
  for (const row of (metricsResult.data ?? []) as Record<string, unknown>[]) {
    const catalogItemId = typeof row.catalog_item_id === 'string' ? row.catalog_item_id : null;
    if (!catalogItemId) continue;
    metricsById.set(catalogItemId, {
      currentStock: asNumber(row.current_stock),
      targetBuffer: asNumber(row.target_buffer),
      distributedLast30Days: asNumber(row.distributed_last_30_days),
      distributedLast365Days: asNumber(row.distributed_last_365_days),
      inventoryItemName: typeof row.inventory_item_name === 'string' ? row.inventory_item_name : null,
      inventoryItemCategory: typeof row.inventory_item_category === 'string' ? row.inventory_item_category : null,
      inventoryUnitType: typeof row.unit_type === 'string' ? row.unit_type : null,
    });
  }

  return ((itemsResult.data ?? []) as Record<string, unknown>[]).map((row) => {
    const id = String(row.id);
    const metrics = metricsById.get(id) ?? defaultMetrics();
    const inventoryId = typeof row.inventory_item_id === 'string' ? row.inventory_item_id : '';
    if (!inventoryId) {
      throw new Error('Catalogue item is missing required inventory mapping.');
    }

    return {
      id,
      slug: String(row.slug ?? ''),
      title: String(row.title ?? ''),
      shortDescription: typeof row.short_description === 'string' ? row.short_description : null,
      longDescription: typeof row.long_description === 'string' ? row.long_description : null,
      category: typeof row.category === 'string' ? row.category : null,
      inventoryItemId: inventoryId,
      unitCostCents: asNumber(row.unit_cost_cents),
      currency: typeof row.currency === 'string' ? row.currency : 'CAD',
      defaultQuantity: asNumber(row.default_quantity) ?? 1,
      priority: asNumber(row.priority) ?? 100,
      targetBuffer: asNumber(row.target_buffer),
      imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
      stripeProductId: typeof row.stripe_product_id === 'string' ? row.stripe_product_id : null,
      stripePriceId: typeof row.stripe_price_id === 'string' ? row.stripe_price_id : null,
      isActive: row.is_active !== false,
      metrics,
    };
  });
}

export type DonationPaymentAdminRow = {
  id: string;
  processedAt: string | null;
  amountCents: number;
  currency: string;
  status: string | null;
  providerPaymentId: string | null;
  providerInvoiceId: string | null;
  providerChargeId: string | null;
  donationIntentId: string | null;
  donationSubscriptionId: string | null;
};

export async function fetchDonationPaymentsAdmin(
  supabase: SupabaseAnyServerClient,
  options: { limit?: number } = {},
): Promise<DonationPaymentAdminRow[]> {
  const donations = supabase.schema('donations');
  const limit = Math.max(1, Math.min(200, options.limit ?? 50));

  const { data, error } = await donations
    .from('donation_payments')
    .select(
      'id, processed_at, amount_cents, currency, status, provider_payment_id, provider_invoice_id, provider_charge_id, donation_intent_id, donation_subscription_id',
    )
    .order('processed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    processedAt: typeof row.processed_at === 'string' ? row.processed_at : null,
    amountCents: asNumber(row.amount_cents) ?? 0,
    currency: requireString(row.currency, 'Donation payment is missing currency.'),
    status: typeof row.status === 'string' ? row.status : null,
    providerPaymentId: typeof row.provider_payment_id === 'string' ? row.provider_payment_id : null,
    providerInvoiceId: typeof row.provider_invoice_id === 'string' ? row.provider_invoice_id : null,
    providerChargeId: typeof row.provider_charge_id === 'string' ? row.provider_charge_id : null,
    donationIntentId: typeof row.donation_intent_id === 'string' ? row.donation_intent_id : null,
    donationSubscriptionId: typeof row.donation_subscription_id === 'string' ? row.donation_subscription_id : null,
  }));
}

export type DonationSubscriptionAdminRow = {
  id: string;
  donorId: string;
  donorEmail: string | null;
  donorName: string | null;
  status: string;
  currency: string;
  amountCents: number;
  stripeSubscriptionId: string;
  stripePriceId: string;
  startedAt: string | null;
  canceledAt: string | null;
  lastInvoiceStatus: string | null;
  lastPaymentAt: string | null;
};

export async function fetchDonationSubscriptionsAdmin(
  supabase: SupabaseAnyServerClient,
  options: { limit?: number } = {},
): Promise<DonationSubscriptionAdminRow[]> {
  const donations = supabase.schema('donations');
  const limit = Math.max(1, Math.min(200, options.limit ?? 100));

  const { data, error } = await donations
    .from('donation_subscriptions')
    .select(
      'id, donor_id, status, currency, amount_cents, stripe_subscription_id, stripe_price_id, started_at, canceled_at, last_invoice_status, last_payment_at, donors (email, name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const donor = (row.donors ?? null) as Record<string, unknown> | null;
    const stripeSubscriptionId = requireString(
      row.stripe_subscription_id,
      'Donation subscription is missing stripe_subscription_id.',
    );
    const stripePriceId = requireString(row.stripe_price_id, 'Donation subscription is missing stripe_price_id.');

    return {
      id: String(row.id),
      donorId: String(row.donor_id),
      donorEmail: donor && typeof donor.email === 'string' ? donor.email : null,
      donorName: donor && typeof donor.name === 'string' ? donor.name : null,
      status: requireString(row.status, 'Donation subscription is missing status.'),
      currency: requireString(row.currency, 'Donation subscription is missing currency.'),
      amountCents: asNumber(row.amount_cents) ?? 0,
      stripeSubscriptionId,
      stripePriceId,
      startedAt: typeof row.started_at === 'string' ? row.started_at : null,
      canceledAt: typeof row.canceled_at === 'string' ? row.canceled_at : null,
      lastInvoiceStatus: typeof row.last_invoice_status === 'string' ? row.last_invoice_status : null,
      lastPaymentAt: typeof row.last_payment_at === 'string' ? row.last_payment_at : null,
    };
  });
}

export type StripeWebhookEventAdminRow = {
  id: string;
  stripeEventId: string;
  type: string;
  receivedAt: string;
  processedAt: string | null;
  status: string | null;
  error: string | null;
};

export async function fetchStripeWebhookEventsAdmin(
  supabase: SupabaseAnyServerClient,
  options: { limit?: number } = {},
): Promise<StripeWebhookEventAdminRow[]> {
  const donations = supabase.schema('donations');
  const limit = Math.max(1, Math.min(200, options.limit ?? 50));

  const { data, error } = await donations
    .from('stripe_webhook_events')
    .select('id, stripe_event_id, type, received_at, processed_at, status, error')
    .order('received_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    stripeEventId: requireString(row.stripe_event_id, 'Stripe webhook event is missing stripe_event_id.'),
    type: requireString(row.type, 'Stripe webhook event is missing type.'),
    receivedAt: requireString(row.received_at, 'Stripe webhook event is missing received_at.'),
    processedAt: typeof row.processed_at === 'string' ? row.processed_at : null,
    status: typeof row.status === 'string' ? row.status : null,
    error: typeof row.error === 'string' ? row.error : null,
  }));
}
