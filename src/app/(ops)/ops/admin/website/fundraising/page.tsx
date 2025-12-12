import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import {
  fetchDonationCatalogAdmin,
  fetchDonationPaymentsAdmin,
  fetchDonationSubscriptionsAdmin,
  fetchStripeWebhookEventsAdmin,
} from '@/lib/donations/service';
import { fetchInventoryItems } from '@/lib/inventory/service';
import { FundraisingHub } from './fundraising-hub';

export const dynamic = 'force-dynamic';

type SettingRow = { setting_key: string; setting_value: string | null };

async function fetchSettings(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  keys: string[],
): Promise<Record<string, string | null>> {
  const { data, error } = await supabase
    .schema('portal')
    .from('public_settings')
    .select('setting_key, setting_value')
    .in('setting_key', keys);

  if (error) throw error;

  const rows = (data ?? []) as SettingRow[];
  const byKey = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
  return Object.fromEntries(keys.map((key) => [key, byKey.get(key) ?? null]));
}

export default async function AdminWebsiteFundraisingPage() {
  const supabase = await createSupabaseRSCClient();

  const stripeSettingKeys = [
    'stripe_donations_mode',
    'stripe_donations_test_secret_key_id',
    'stripe_donations_test_webhook_secret_id',
    'stripe_donations_live_secret_key_id',
    'stripe_donations_live_webhook_secret_id',
  ];

  const [catalog, inventoryItems, payments, subscriptions, webhookEvents, stripeSettings] = await Promise.all([
    fetchDonationCatalogAdmin(supabase),
    fetchInventoryItems(supabase),
    fetchDonationPaymentsAdmin(supabase, { limit: 50 }),
    fetchDonationSubscriptionsAdmin(supabase, { limit: 100 }),
    fetchStripeWebhookEventsAdmin(supabase, { limit: 50 }),
    fetchSettings(supabase, stripeSettingKeys),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Website & Marketing</p>
        <h1 className="text-3xl text-foreground sm:text-4xl">Fundraising</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Manage the symbolic donation catalogue, Stripe bindings, and webhook-backed reconciliation for one-time and monthly donations.
        </p>
      </header>

      <FundraisingHub
        catalog={catalog}
        inventoryItems={inventoryItems}
        payments={payments}
        subscriptions={subscriptions}
        webhookEvents={webhookEvents}
        stripeSettings={stripeSettings}
      />
    </div>
  );
}

