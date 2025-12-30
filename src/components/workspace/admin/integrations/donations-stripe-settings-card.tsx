'use client';

import { useMemo, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { setStripeDonationsModeAction, upsertStripeDonationsCredentialsAction } from '@/app/(app-admin)/app-admin/donations/actions';

type Props = {
  stripeSettings: Record<string, string | null>;
};

export function DonationsStripeSettingsCard({ stripeSettings }: Props) {
  const stripeMode = (stripeSettings.stripe_donations_mode?.trim().toLowerCase() ?? null) as 'test' | 'live' | null;
  const isModeValid = stripeMode === 'test' || stripeMode === 'live';
  const [selectedStripeMode, setSelectedStripeMode] = useState<'test' | 'live' | null>(null);
  const effectiveStripeMode = selectedStripeMode ?? (isModeValid ? stripeMode : 'test');

  const hasTestKeys = Boolean(
    stripeSettings.stripe_donations_test_secret_key_id && stripeSettings.stripe_donations_test_webhook_secret_id,
  );
  const hasLiveKeys = Boolean(
    stripeSettings.stripe_donations_live_secret_key_id && stripeSettings.stripe_donations_live_webhook_secret_id,
  );

  const credentialSummary = useMemo(
    () => [
      {
        mode: 'test' as const,
        secretId: stripeSettings.stripe_donations_test_secret_key_id,
        webhookId: stripeSettings.stripe_donations_test_webhook_secret_id,
        configured: hasTestKeys,
      },
      {
        mode: 'live' as const,
        secretId: stripeSettings.stripe_donations_live_secret_key_id,
        webhookId: stripeSettings.stripe_donations_live_webhook_secret_id,
        configured: hasLiveKeys,
      },
    ],
    [
      hasLiveKeys,
      hasTestKeys,
      stripeSettings.stripe_donations_live_secret_key_id,
      stripeSettings.stripe_donations_live_webhook_secret_id,
      stripeSettings.stripe_donations_test_secret_key_id,
      stripeSettings.stripe_donations_test_webhook_secret_id,
    ],
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">Stripe (donations)</CardTitle>
            <CardDescription>Mode + credentials stored in Supabase Vault.</CardDescription>
          </div>
          <span className="capitalize">
            {stripeMode ?? 'unset'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTitle>Webhook mode reminder</AlertTitle>
          <AlertDescription>
            Switching modes changes which webhook signing secret is used. Confirm the Stripe Dashboard webhook endpoint matches the active mode.
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
                <input type="hidden" name="mode" value={effectiveStripeMode} />
                <Select
                  value={effectiveStripeMode}
                  onValueChange={(value) => {
                    if (value === 'test' || value === 'live') setSelectedStripeMode(value);
                  }}
                  required
                >
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
                <span>{hasTestKeys ? 'Configured' : 'Missing'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Live credentials</span>
                <span>{hasLiveKeys ? 'Configured' : 'Missing'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="grid gap-4 lg:grid-cols-2">
              {credentialSummary.map((entry) => (
                <form
                  key={entry.mode}
                  action={upsertStripeDonationsCredentialsAction}
                  className="space-y-4 rounded-2xl border border-border/40 bg-background p-4"
                >
                  <input type="hidden" name="mode" value={entry.mode} />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold capitalize text-foreground">{entry.mode} credentials</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`stripe-secret-${entry.mode}`}>Stripe secret key</Label>
                    <Input
                      id={`stripe-secret-${entry.mode}`}
                      name="stripe_secret_key"
                      type="password"
                      autoComplete="off"
                      placeholder="sk_…"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Current secret id: {entry.secretId ?? '—'}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`stripe-webhook-${entry.mode}`}>Webhook signing secret</Label>
                    <Input
                      id={`stripe-webhook-${entry.mode}`}
                      name="stripe_webhook_secret"
                      type="password"
                      autoComplete="off"
                      placeholder="whsec_…"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Current webhook secret id: {entry.webhookId ?? '—'}</p>
                  </div>

                  <Button type="submit" className="w-full" variant={entry.configured ? 'secondary' : 'default'}>
                    Save {entry.mode} secrets
                  </Button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
