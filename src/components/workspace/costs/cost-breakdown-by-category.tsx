import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

const formatter = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

export type CostBreakdownRow = {
  category: string;
  total: number;
  cost30: number;
  cost365: number;
};

export function CostBreakdownByCategory({ rows }: { rows: CostBreakdownRow[] }) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Cost breakdown</CardTitle>
        <CardDescription>Totals by cost category.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No costs recorded for this organization yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Lifetime</th>
                <th className="py-2 pr-4">Last 30 days</th>
                <th className="py-2 pr-4">Last 365 days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.category} className="border-b border-border/30">
                  <td className="py-3 pr-4 capitalize text-foreground">{row.category}</td>
                  <td className="py-3 pr-4 font-semibold text-foreground">{formatter.format(row.total)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatter.format(row.cost30)}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{formatter.format(row.cost365)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
