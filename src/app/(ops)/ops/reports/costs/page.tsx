import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchCostCategories, fetchOrgCostDaily, fetchOrgCostRollups } from '@/lib/costs/queries';
import { refreshCostRollupsAction } from '@/lib/costs/actions';
import { PageHeader } from '@shared/layout/page-header';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { CostBreakdownByCategory } from '@workspace/costs/cost-breakdown-by-category';
import { OrgCostSummary } from '@workspace/costs/org-cost-summary';

export const dynamic = 'force-dynamic';

export default async function CostReportsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/auth/start?next=/ops/reports/costs');
  }

  if (!access.canReportCosts) {
    redirect(resolveLandingPath(access));
  }

  if (!access.organizationId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Reports"
          title="Cost reporting"
          description="Select an acting organization to view cost rollups."
          breadcrumbs={[{ label: 'Operations', href: '/ops/today' }, { label: 'Reports' }, { label: 'Costs' }]}
        />
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Organization required</CardTitle>
            <CardDescription>Pick the organization you want to report on before opening this dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/ops/profile">Select organization</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [rollups, dailyRows, categories] = await Promise.all([
    fetchOrgCostRollups(supabase, access.organizationId),
    fetchOrgCostDaily(supabase, access.organizationId, 90),
    fetchCostCategories(supabase),
  ]);

  const categoryLookup = new Map(categories.map((category) => [category.id, category.name]));
  const breakdownRows = rollups
    .map((row) => ({
      category: row.cost_category_id ? categoryLookup.get(row.cost_category_id) ?? 'Uncategorized' : 'Uncategorized',
      total: Number(row.total_cost ?? 0),
      cost30: Number(row.cost_30d ?? 0),
      cost365: Number(row.cost_365d ?? 0),
    }))
    .sort((a, b) => b.total - a.total);

  const dailyTotalsMap = new Map<string, number>();
  for (const row of dailyRows) {
    if (!row.day) continue;
    const day = row.day as string;
    const total = Number(row.total_cost ?? 0);
    dailyTotalsMap.set(day, (dailyTotalsMap.get(day) ?? 0) + total);
  }
  const dailyTotals = Array.from(dailyTotalsMap, ([day, total_cost]) => ({ day, total_cost })).sort((a, b) =>
    a.day.localeCompare(b.day),
  );
  const lifetimeTotal = breakdownRows.reduce((acc, row) => acc + row.total, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Cost reporting"
        description="Track total cost, category breakdowns, and daily trends for this organization."
        breadcrumbs={[{ label: 'Operations', href: '/ops/today' }, { label: 'Reports' }, { label: 'Costs' }]}
        meta={[
          {
            label: `Organization: ${access.organizationName ?? `#${access.organizationId}`}`,
            tone: 'neutral',
          },
        ]}
        actions={
          <form action={refreshCostRollupsAction}>
            <Button size="sm" variant="outline" type="submit">
              Refresh now
            </Button>
          </form>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <OrgCostSummary data={dailyTotals} total={lifetimeTotal} />
        <CostBreakdownByCategory rows={breakdownRows} />
      </section>
    </div>
  );
}
