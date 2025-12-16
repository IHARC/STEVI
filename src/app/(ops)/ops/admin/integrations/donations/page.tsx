import Link from 'next/link';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { fetchDonationCatalogAdminStats, fetchDonationPaymentsAdmin, fetchDonationSubscriptionsAdmin, fetchStripeWebhookEventsAdmin } from '@/lib/donations/service';
import { PageHeader } from '@shared/layout/page-header';
import { Button } from '@shared/ui/button';
import { DonationsIntegrationsHub } from './ui/donations-integrations-hub';

export const dynamic = 'force-dynamic';

type SettingRow = { setting_key: string; setting_value: string | null };

async function fetchPublicSettings(
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

export default async function OpsAdminDonationsIntegrationsPage() {
  const supabase = await createSupabaseRSCClient();

  const stripeSettingKeys = [
    'stripe_donations_mode',
    'stripe_donations_test_secret_key_id',
    'stripe_donations_test_webhook_secret_id',
    'stripe_donations_live_secret_key_id',
    'stripe_donations_live_webhook_secret_id',
  ];

  const emailSettingKeys = [
    'donations_email_from',
    'donations_email_provider',
    'donations_sendgrid_api_key_secret_id',
  ];

  const [catalogStats, payments, subscriptions, webhookEvents, stripeSettings, emailSettings] = await Promise.all([
    fetchDonationCatalogAdminStats(supabase),
    fetchDonationPaymentsAdmin(supabase, { limit: 50 }),
    fetchDonationSubscriptionsAdmin(supabase, { limit: 100 }),
    fetchStripeWebhookEventsAdmin(supabase, { limit: 50 }),
    fetchPublicSettings(supabase, stripeSettingKeys),
    fetchPublicSettings(supabase, emailSettingKeys),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Donations (Stripe)"
        description="Stripe mode, secrets, email sender, and webhook-backed reconciliation for donations."
        meta={[{ label: 'IHARC only', tone: 'warning' }]}
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/ops/supplies?tab=donations">Donation catalogue</Link>
          </Button>
        }
      />

      <DonationsIntegrationsHub
        catalogCount={catalogStats.total}
        payments={payments}
        subscriptions={subscriptions}
        webhookEvents={webhookEvents}
        stripeSettings={stripeSettings}
        emailSettings={emailSettings}
      />
    </div>
  );
}
