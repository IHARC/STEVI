'use client';

import { useMemo, useState } from 'react';
import type { StripeWebhookEventAdminRow } from '@/lib/donations/service';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { reprocessStripeWebhookEventAction } from '@/app/(app-admin)/app-admin/donations/actions';

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

type Props = {
  events: StripeWebhookEventAdminRow[];
};

export function DonationsWebhookEventsCard({ events }: Props) {
  const [query, setQuery] = useState('');

  const lastWebhookSuccess = useMemo(
    () => events.find((event) => event.status === 'succeeded')?.processedAt ?? null,
    [events],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((row) => {
      const haystack = [row.stripeEventId, row.type, row.status, row.error].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [events, query]);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="text-xl">Webhooks (donations)</CardTitle>
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
            value={query}
            onChange={(event) => setQuery(event.target.value)}
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
            {filtered.map((event) => (
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
            {filtered.length === 0 ? (
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
  );
}

