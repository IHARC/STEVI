'use client';

import { useMemo, useState } from 'react';
import type { DonationPaymentAdminRow } from '@/lib/donations/service';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';

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

export function DonationPaymentsTable({ payments }: { payments: DonationPaymentAdminRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
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
  }, [payments, query]);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-xl">Donations inbox</CardTitle>
          <CardDescription>Most recent Stripe-backed payments recorded via webhooks.</CardDescription>
        </div>
        <Badge variant="secondary">{filtered.length} shown</Badge>
      </CardHeader>
      <CardContent className="space-y-4 overflow-x-auto">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="payments-filter">Filter</Label>
          <Input id="payments-filter" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search provider IDs, status…" />
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
            {filtered.map((payment) => (
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
            {filtered.length === 0 ? (
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
  );
}

