import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@shared/ui/chart';

const formatter = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' });

export type OrgCostDaily = {
  day: string;
  total_cost: number;
};

export function OrgCostSummary({ data, total }: { data: OrgCostDaily[]; total: number }) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-xl">Organization cost trend</CardTitle>
        <CardDescription>Daily total cost across all categories and clients.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Lifetime total</p>
          <p className="text-2xl font-semibold text-foreground">{formatter.format(total)}</p>
        </div>
        <div className="h-64">
          <ChartContainer
            config={{ total: { label: 'Total cost', color: 'primary' } }}
            className="h-64"
          >
            <AreaChart data={data} margin={{ left: 0, right: 0 }}>
              <defs>
                <linearGradient id="costFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickMargin={8} tickFormatter={(value) => value.slice(5)} />
              <YAxis tickFormatter={(value) => formatter.format(Number(value))} width={80} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="total_cost"
                name="Cost"
                stroke="var(--color-total)"
                fill="url(#costFill)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
