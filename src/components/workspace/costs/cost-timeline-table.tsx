import type { CostEventWithCategory } from '@/lib/costs/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';

const formatter = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });
const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium' });

const SOURCE_LABELS: Record<string, string> = {
  activity: 'Outreach',
  distribution: 'Supplies',
  inventory_tx: 'Inventory',
  appointment: 'Appointment',
  manual: 'Manual',
  external: 'External',
};

function formatDate(value: string | null) {
  if (!value) return 'Unknown date';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export function CostTimelineTable({ events }: { events: CostEventWithCategory[] }) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Cost timeline</CardTitle>
        <CardDescription>Trace every cost event back to the source.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cost events recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b border-border/30">
                  <td className="py-3 pr-4 text-foreground">{formatDate(event.occurred_at)}</td>
                  <td className="py-3 pr-4">
                    {event.cost_categories?.name ? (
                      <Badge variant="secondary" className="capitalize">
                        {event.cost_categories.name.replaceAll('_', ' ')}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Uncategorized</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground capitalize">
                    {SOURCE_LABELS[event.source_type ?? ''] ?? event.source_type ?? 'Unknown'}
                  </td>
                  <td className="py-3 pr-4 font-semibold text-foreground">
                    {formatter.format(Number(event.cost_amount ?? 0))}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {event.quantity ? `${Number(event.quantity).toFixed(2)} ${event.uom ?? ''}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
