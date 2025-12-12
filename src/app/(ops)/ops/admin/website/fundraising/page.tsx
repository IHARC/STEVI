import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { fetchDonationCatalogAdmin, fetchDonationPaymentsAdmin, fetchDonationSubscriptionsAdmin, fetchStripeWebhookEventsAdmin } from '@/lib/donations/service';
import { fetchInventoryItems } from '@/lib/inventory/service';
import { DonationCatalogAdmin } from '@/components/workspace/admin/donations/donation-catalog-admin';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import {
  cancelDonationSubscriptionAction,
  resendDonationManageLinkAction,
  reprocessStripeWebhookEventAction,
  setStripeDonationsModeAction,
  upsertStripeDonationsCredentialsAction,
} from './actions';

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

function formatCurrency(amountCents: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amountCents / 100,
  );
}

function formatWhen(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
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

  const lastWebhookSuccess = webhookEvents.find((event) => event.status === 'succeeded')?.processedAt ?? null;
  const stripeMode = stripeSettings.stripe_donations_mode?.trim().toLowerCase() ?? null;
  const isModeValid = stripeMode === 'test' || stripeMode === 'live';
  const hasTestKeys = Boolean(
    stripeSettings.stripe_donations_test_secret_key_id && stripeSettings.stripe_donations_test_webhook_secret_id,
  );
  const hasLiveKeys = Boolean(
    stripeSettings.stripe_donations_live_secret_key_id && stripeSettings.stripe_donations_live_webhook_secret_id,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Website & Marketing</p>
        <h1 className="text-3xl text-foreground sm:text-4xl">Fundraising</h1>
        <p className="max-w-4xl text-sm text-muted-foreground">
          Manage the symbolic donation catalogue, Stripe bindings, and webhook-backed reconciliation for one-time and monthly donations.
        </p>
      </header>

      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Stripe configuration</CardTitle>
          <CardDescription>
            Stripe secrets are stored in Supabase Vault and are selected by the active mode. There are no environment-variable fallbacks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTitle>Test mode reminder</AlertTitle>
            <AlertDescription>
              Switching to test mode disables live-mode webhook processing until you switch back. Always confirm the Stripe Dashboard webhook endpoint matches the mode.
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Active mode</p>
                <Badge variant={isModeValid ? 'secondary' : 'destructive'} className="capitalize">
                  {isModeValid ? stripeMode : 'Not configured'}
                </Badge>
              </div>

              <form action={setStripeDonationsModeAction} className="space-y-2">
                <Label htmlFor="stripe-mode">Switch mode</Label>
                <Select name="mode" defaultValue={isModeValid ? stripeMode : undefined} required>
                  <SelectTrigger id="stripe-mode">
                    <SelectValue placeholder="Select a mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" className="w-full">
                  Apply mode
                </Button>
              </form>

              <div className="grid gap-2 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Test credentials</span>
                  <Badge variant={hasTestKeys ? 'outline' : 'secondary'}>{hasTestKeys ? 'Configured' : 'Missing'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Live credentials</span>
                  <Badge variant={hasLiveKeys ? 'outline' : 'secondary'}>{hasLiveKeys ? 'Configured' : 'Missing'}</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div className="grid gap-4 lg:grid-cols-2">
                {(['test', 'live'] as const).map((mode) => (
                  <form
                    key={mode}
                    action={upsertStripeDonationsCredentialsAction}
                    className="space-y-4 rounded-2xl border border-border/40 bg-background p-4"
                  >
                    <input type="hidden" name="mode" value={mode} />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold capitalize text-foreground">{mode} credentials</p>
                      <Badge variant="outline">Vault-managed</Badge>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`stripe-secret-${mode}`}>Stripe secret key</Label>
                      <Input
                        id={`stripe-secret-${mode}`}
                        name="stripe_secret_key"
                        type="password"
                        autoComplete="off"
                        placeholder={mode === 'test' ? 'sk_test_…' : 'sk_live_…'}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`stripe-webhook-${mode}`}>Webhook signing secret</Label>
                      <Input
                        id={`stripe-webhook-${mode}`}
                        name="stripe_webhook_secret"
                        type="password"
                        autoComplete="off"
                        placeholder="whsec_…"
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" variant={mode === 'live' ? 'default' : 'secondary'}>
                      Save {mode} secrets
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Catalogue</CardTitle>
          <CardDescription>
            Items shown on iharc.ca are inventory-backed. Stripe prices are created and managed through the “Sync Stripe price” action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DonationCatalogAdmin catalog={catalog} inventoryItems={inventoryItems} />
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">Donations inbox</CardTitle>
            <CardDescription>Most recent Stripe-backed payments recorded via webhooks.</CardDescription>
          </div>
          <Badge variant="secondary">{payments.length} shown</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Processed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Provider IDs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap">{formatWhen(payment.processedAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={payment.status === 'succeeded' ? 'secondary' : payment.status ? 'destructive' : 'outline'}
                      className="capitalize"
                    >
                      {payment.status ?? 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium text-foreground">
                    {formatCurrency(payment.amountCents, payment.currency)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>pi: {payment.providerPaymentId ?? '—'}</div>
                    <div>in: {payment.providerInvoiceId ?? '—'}</div>
                    <div>ch: {payment.providerChargeId ?? '—'}</div>
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">
                    No payments recorded yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">Monthly donors</CardTitle>
            <CardDescription>Active and recently updated subscriptions. Donors manage details through Stripe Customer Portal.</CardDescription>
          </div>
          <Badge variant="secondary">{subscriptions.length} shown</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Last payment</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="text-foreground">{sub.donorEmail ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={sub.status === 'active' || sub.status === 'trialing' ? 'secondary' : 'destructive'}
                      className="capitalize"
                    >
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium text-foreground">
                    {formatCurrency(sub.amountCents, sub.currency)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatWhen(sub.startedAt)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatWhen(sub.lastPaymentAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {sub.donorEmail ? (
                        <form action={resendDonationManageLinkAction}>
                          <input type="hidden" name="email" value={sub.donorEmail} />
                          <Button type="submit" size="sm" variant="secondary">
                            Resend manage link
                          </Button>
                        </form>
                      ) : null}
                      <form action={cancelDonationSubscriptionAction}>
                        <input type="hidden" name="stripe_subscription_id" value={sub.stripeSubscriptionId} />
                        <Button type="submit" size="sm" variant="destructive">
                          Cancel
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    No subscriptions recorded yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">Webhook health</CardTitle>
            <CardDescription>
              Latest Stripe webhook events processed by Supabase. Last successful processing: {lastWebhookSuccess ? formatWhen(lastWebhookSuccess) : '—'}.
            </CardDescription>
          </div>
          <Badge variant={lastWebhookSuccess ? 'secondary' : 'destructive'}>{lastWebhookSuccess ? 'Healthy' : 'No successes yet'}</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhookEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap">{formatWhen(event.receivedAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{event.type}</TableCell>
                  <TableCell>
                    <Badge
                      variant={event.status === 'succeeded' ? 'secondary' : event.status === 'failed' ? 'destructive' : 'outline'}
                      className="capitalize"
                    >
                      {event.status ?? 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[520px] truncate text-xs text-muted-foreground">{event.error ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {event.status === 'failed' ? (
                      <form action={reprocessStripeWebhookEventAction}>
                        <input type="hidden" name="stripe_event_id" value={event.stripeEventId} />
                        <Button type="submit" size="sm" variant="secondary">
                          Retry
                        </Button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {webhookEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    No webhook events recorded yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
