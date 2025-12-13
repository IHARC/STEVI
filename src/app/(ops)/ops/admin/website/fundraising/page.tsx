import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import {
  fetchDonationCatalogAdmin,
  fetchDonationPaymentsAdmin,
  fetchDonationSubscriptionsAdmin,
  fetchStripeWebhookEventsAdmin,
} from '@/lib/donations/service';
import { fetchInventoryItems } from '@/lib/inventory/service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
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
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Fundraising</CardTitle>
        <CardDescription>
          Manage the symbolic donation catalogue, Stripe bindings, and webhook-backed reconciliation for one-time and monthly donations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FundraisingHub
          catalog={catalog}
          inventoryItems={inventoryItems}
          payments={payments}
          subscriptions={subscriptions}
          webhookEvents={webhookEvents}
          stripeSettings={stripeSettings}
        />
      </CardContent>
    </Card>
  );
}
