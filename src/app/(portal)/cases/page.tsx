import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchClientCases } from '@/lib/cases/fetchers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

export default async function ClientCasesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/cases');
  }

  if (!access.isProfileApproved) {
    redirect(resolveLandingPath(access));
  }

  const cases = await fetchClientCases(supabase, access.userId);

  return (
    <div className="page-shell page-stack">
      <header className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase text-muted-foreground">My support</p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">My cases</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          View your active cases and share updates with your IHARC team. Staff will reach out using your consent
          preferences.
        </p>
      </header>

      {cases.length === 0 ? (
        <EmptyState
          title="No cases yet"
          description="Your intake may be awaiting staff onboarding. You can submit a request in Support or check your consents."
          action={(
            <div className="flex flex-wrap justify-center gap-space-sm">
              <Button asChild variant="default">
                <Link href="/support">Get help</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/profile/consents">Review consents</Link>
              </Button>
            </div>
          )}
        />
      ) : (
        <div className="grid gap-space-md md:grid-cols-2">
          {cases.map((item) => (
            <Card key={item.id} className="h-full">
              <CardHeader className="flex flex-row items-start justify-between gap-space-sm">
                <div className="space-y-space-3xs">
                  <CardTitle className="text-title-md">{item.caseType ?? 'Support case'}</CardTitle>
                  <CardDescription>Case #{item.caseNumber ?? item.id}</CardDescription>
                  <p className="text-body-sm text-muted-foreground">Case manager: {item.caseManagerName}</p>
                </div>
                <Badge variant={item.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {item.status ?? 'active'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-space-sm text-body-sm text-on-surface/80">
                <p>Priority: {item.priority ?? 'standard'}</p>
                <p>Started: {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'Pending'}</p>
                <Button asChild variant="outline" className="mt-space-sm w-full">
                  <Link href={`/cases/${item.id}`}>Open case</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
