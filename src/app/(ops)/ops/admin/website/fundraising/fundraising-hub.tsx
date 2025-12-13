'use client';

import { useMemo, useState } from 'react';
import { DonationCatalogAdmin } from '@/components/workspace/admin/donations/donation-catalog-admin';
import type { DonationCatalogItem } from '@/lib/donations/types';
import type { DonationPaymentAdminRow, DonationSubscriptionAdminRow, StripeWebhookEventAdminRow } from '@/lib/donations/service';
import type { InventoryItem } from '@/lib/inventory/types';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shared/ui/tabs';
import {
  cancelDonationSubscriptionAction,
  resendDonationManageLinkAction,
  reprocessStripeWebhookEventAction,
  setStripeDonationsModeAction,
  upsertStripeDonationsCredentialsAction,
} from './actions';

type FundraisingHubProps = {
  catalog: DonationCatalogItem[];
  inventoryItems: InventoryItem[];
  payments: DonationPaymentAdminRow[];
  subscriptions: DonationSubscriptionAdminRow[];
  webhookEvents: StripeWebhookEventAdminRow[];
  stripeSettings: Record<string, string | null>;
};

function formatMoney(amountCents: number, currency = 'CAD') {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
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

const DEFAULT_TAB = 'dashboard';

export function FundraisingHub({ catalog, inventoryItems, payments, subscriptions, webhookEvents, stripeSettings }: FundraisingHubProps) {
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);
  const [paymentQuery, setPaymentQuery] = useState('');
  const [subscriptionQuery, setSubscriptionQuery] = useState('');
  const [webhookQuery, setWebhookQuery] = useState('');

  const lastWebhookSuccess = useMemo(
    () => webhookEvents.find((event) => event.status === 'succeeded')?.processedAt ?? null,
    [webhookEvents],
  );

  const stripeMode = (stripeSettings.stripe_donations_mode?.trim().toLowerCase() ?? null) as 'test' | 'live' | null;
  const isModeValid = stripeMode === 'test' || stripeMode === 'live';
  const hasTestKeys = Boolean(
    stripeSettings.stripe_donations_test_secret_key_id && stripeSettings.stripe_donations_test_webhook_secret_id,
  );
  const hasLiveKeys = Boolean(
    stripeSettings.stripe_donations_live_secret_key_id && stripeSettings.stripe_donations_live_webhook_secret_id,
  );

  const filteredPayments = useMemo(() => {
    const q = paymentQuery.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((row) => {
      const haystack = [
        row.status,
        row.currency,
        row.providerPaymentId,
        row.providerInvoiceId,
        row.providerChargeId,
        row.donationIntentId,
        row.donationSubscriptionId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [paymentQuery, payments]);

  const filteredSubscriptions = useMemo(() => {
    const q = subscriptionQuery.trim().toLowerCase();
    if (!q) return subscriptions;
    return subscriptions.filter((row) => {
      const haystack = [row.donorEmail, row.status, row.currency, row.stripeSubscriptionId].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [subscriptionQuery, subscriptions]);

  const filteredWebhookEvents = useMemo(() => {
    const q = webhookQuery.trim().toLowerCase();
    if (!q) return webhookEvents;
    return webhookEvents.filter((row) => {
      const haystack = [row.stripeEventId, row.type, row.status, row.error].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [webhookEvents, webhookQuery]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-2xl">
          <TabsTrigger value="dashboard" className="shrink-0 rounded-full px-4 text-xs font-semibold">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="stripe" className="shrink-0 rounded-full px-4 text-xs font-semibold">
            Stripe
          </TabsTrigger>
          <TabsTrigger value="catalog" className="shrink-0 rounded-full px-4 text-xs font-semibold">
            Catalogue
          </TabsTrigger>
          <TabsTrigger value="donations" className="shrink-0 rounded-full px-4 text-xs font-semibold">
            Donations
          </TabsTrigger>
          <TabsTrigger value="monthly" className="shrink-0 rounded-full px-4 text-xs font-semibold">
            Monthly donors
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="shrink-0 rounded-full px-4 text-xs font-semibold">
            Webhooks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Stripe mode</CardTitle>
                <CardDescription>Vault-managed secrets. No env fallbacks.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Active</div>
                <Badge variant={isModeValid ? 'secondary' : 'destructive'} className="capitalize">
                  {stripeMode ?? 'unset'}
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Webhook health</CardTitle>
                <CardDescription>Most recent succeeded event.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{formatWhen(lastWebhookSuccess)}</div>
                <Badge variant={lastWebhookSuccess ? 'secondary' : 'destructive'}>{lastWebhookSuccess ? 'Healthy' : 'Missing'}</Badge>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Activity</CardTitle>
                <CardDescription>Latest rows loaded.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Payments</p>
                  <p className="text-lg font-semibold text-foreground">{payments.length}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Subscriptions</p>
                  <p className="text-lg font-semibold text-foreground">{subscriptions.length}</p>
                </div>
                <div className="rounded-xl bg-muted p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Events</p>
                  <p className="text-lg font-semibold text-foreground">{webhookEvents.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stripe">
          <Card className="border-border/60">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Stripe configuration</CardTitle>
              <CardDescription>
                Stripe secrets are stored in Supabase Vault and are selected by the active mode.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTitle>Test mode reminder</AlertTitle>
                <AlertDescription>
                  Switching to test mode changes which webhook signing secret is used. Confirm the Stripe Dashboard webhook endpoint matches the mode.
                </AlertDescription>
              </Alert>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 rounded-2xl border border-border/40 bg-background p-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Active mode</p>
                    <p className="text-xs text-muted-foreground">Used by Supabase Edge Functions.</p>
                  </div>

                  <form action={setStripeDonationsModeAction} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="stripe-mode">Stripe mode</Label>
                      <Select name="mode" defaultValue={isModeValid ? stripeMode ?? undefined : undefined} required>
                        <SelectTrigger id="stripe-mode">
                          <SelectValue placeholder="Select a mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="test">Test</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
        </TabsContent>

        <TabsContent value="catalog">
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
        </TabsContent>

        <TabsContent value="donations">
          <Card className="border-border/60">
            <CardHeader className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-xl">Donations inbox</CardTitle>
                <CardDescription>Most recent Stripe-backed payments recorded via webhooks.</CardDescription>
              </div>
              <Badge variant="secondary">{filteredPayments.length} shown</Badge>
            </CardHeader>
            <CardContent className="space-y-4 overflow-x-auto">
              <div className="max-w-sm space-y-2">
                <Label htmlFor="payment-filter">Filter</Label>
                <Input
                  id="payment-filter"
                  value={paymentQuery}
                  onChange={(event) => setPaymentQuery(event.target.value)}
                  placeholder="Search provider IDs, status…"
                />
              </div>

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
                  {filteredPayments.map((payment) => (
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
                        {formatMoney(payment.amountCents, payment.currency)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>pi: {payment.providerPaymentId ?? '—'}</div>
                        <div>in: {payment.providerInvoiceId ?? '—'}</div>
                        <div>ch: {payment.providerChargeId ?? '—'}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground">
                        No matching payments.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card className="border-border/60">
            <CardHeader className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-xl">Monthly donors</CardTitle>
                <CardDescription>
                  Active and recently updated subscriptions. Donors manage details through Stripe Customer Portal.
                </CardDescription>
              </div>
              <Badge variant="secondary">{filteredSubscriptions.length} shown</Badge>
            </CardHeader>
            <CardContent className="space-y-4 overflow-x-auto">
              <div className="max-w-sm space-y-2">
                <Label htmlFor="subscription-filter">Filter</Label>
                <Input
                  id="subscription-filter"
                  value={subscriptionQuery}
                  onChange={(event) => setSubscriptionQuery(event.target.value)}
                  placeholder="Search email, status, sub_…"
                />
              </div>

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
                  {filteredSubscriptions.map((sub) => (
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
                        {formatMoney(sub.amountCents, sub.currency)}
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
                  {filteredSubscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-sm text-muted-foreground">
                        No matching subscriptions.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card className="border-border/60">
            <CardHeader className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-xl">Webhook events</CardTitle>
                <CardDescription>
                  Latest Stripe webhook events processed by Supabase. Last successful processing: {formatWhen(lastWebhookSuccess)}.
                </CardDescription>
              </div>
              <Badge variant={lastWebhookSuccess ? 'secondary' : 'destructive'}>{lastWebhookSuccess ? 'Healthy' : 'No successes yet'}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 overflow-x-auto">
              <div className="max-w-sm space-y-2">
                <Label htmlFor="webhook-filter">Filter</Label>
                <Input
                  id="webhook-filter"
                  value={webhookQuery}
                  onChange={(event) => setWebhookQuery(event.target.value)}
                  placeholder="Search evt_, type, error…"
                />
              </div>

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
                  {filteredWebhookEvents.map((event) => (
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
                  {filteredWebhookEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No matching webhook events.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
