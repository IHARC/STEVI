import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

const formatter = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

export type CostSnapshot = {
  total: number;
  cost30: number;
  cost90: number;
  cost365: number;
};

export function CostSnapshotCard({ totals }: { totals: CostSnapshot }) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Cost snapshot</CardTitle>
        <CardDescription>Running totals based on consented, cross-org cost events.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-foreground/80 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Lifetime</p>
          <p className="text-lg font-semibold text-foreground">{formatter.format(totals.total)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Last 30 days</p>
          <p className="text-lg font-semibold text-foreground">{formatter.format(totals.cost30)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Last 90 days</p>
          <p className="text-lg font-semibold text-foreground">{formatter.format(totals.cost90)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Last 365 days</p>
          <p className="text-lg font-semibold text-foreground">{formatter.format(totals.cost365)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
