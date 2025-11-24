import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchStaffCases } from '@/lib/cases/fetchers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

export default async function StaffCasesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) redirect('/login?next=/staff/cases');
  if (!access.canAccessStaffWorkspace) redirect(resolveDefaultWorkspacePath(access));

  const cases = await fetchStaffCases(supabase, 100);

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">Caseload</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">All cases</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Filtered automatically by Supabase RLS. Use this view to jump into any case you can access.
        </p>
      </header>

      <div className="grid gap-space-md md:grid-cols-2 xl:grid-cols-3">
        {cases.map((item) => (
          <Card key={item.id} className="h-full">
            <CardHeader className="flex flex-row items-start justify-between gap-space-sm">
              <div className="space-y-space-3xs">
                <CardTitle className="text-title-md">{item.caseType ?? 'Support case'}</CardTitle>
                <CardDescription>Case #{item.caseNumber ?? item.id}</CardDescription>
                <p className="text-body-sm text-muted-foreground">Managed by {item.caseManagerName}</p>
              </div>
              <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                {item.status ?? 'active'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-space-sm text-body-sm text-on-surface/80">
              <p>Priority: {item.priority ?? 'standard'}</p>
              <p>Started: {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'Pending'}</p>
              <Button asChild variant="outline" className="mt-space-sm w-full">
                <Link href={`/staff/cases/${item.id}`}>Open case</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {cases.length === 0 ? (
          <Card className="border-dashed border-outline/60">
            <CardHeader>
              <CardTitle className="text-title-md">No cases</CardTitle>
              <CardDescription>Cases assigned to you will appear here automatically.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
