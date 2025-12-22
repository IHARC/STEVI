'use client';

import { useMemo, useState } from 'react';
import type { DonationSubscriptionAdminRow } from '@/lib/donations/service';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { cancelDonationSubscriptionAction, resendDonationManageLinkAction } from '@/app/(app-admin)/app-admin/donations/actions';

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

export function DonationSubscriptionsTable({ subscriptions }: { subscriptions: DonationSubscriptionAdminRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subscriptions;
    return subscriptions.filter((row) => {
      const haystack = [row.donorEmail, row.status, row.currency, row.stripeSubscriptionId].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [query, subscriptions]);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-xl">Monthly subscriptions</CardTitle>
          <CardDescription>Active and canceled donor subscriptions tracked via Stripe.</CardDescription>
        </div>
        <Badge variant="secondary">{filtered.length} shown</Badge>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="subscriptions-filter">Filter</Label>
          <Input
            id="subscriptions-filter"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search email, status, sub_…"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Donor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Stripe</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="whitespace-nowrap">{formatWhen(sub.startedAt)}</TableCell>
                <TableCell>
                  <Badge variant={sub.status === 'active' ? 'secondary' : 'outline'} className="capitalize">
                    {sub.status ?? 'unknown'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{sub.donorEmail ?? '—'}</TableCell>
                <TableCell className="whitespace-nowrap font-medium text-foreground">{formatMoney(sub.amountCents, sub.currency)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{sub.stripeSubscriptionId}</TableCell>
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
            {filtered.length === 0 ? (
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
  );
}

