import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchClientCases } from '@/lib/cases/fetchers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { EmptyState } from '@shared/ui/empty-state';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

export default async function ClientCasesPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/auth/start?next=/cases');
  }

  if (!access.isProfileApproved) {
    redirect(resolveLandingPath(access));
  }

  const cases = await fetchClientCases(supabase, access.userId);

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase text-muted-foreground">My support</p>
        <h1 className="text-3xl text-foreground sm:text-4xl">My cases</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          View your active cases and share updates with your IHARC team. Staff will reach out using your consent
          preferences.
        </p>
      </header>

      {cases.length === 0 ? (
        <EmptyState
          title="No cases yet"
          description="Your intake may be awaiting staff onboarding. You can submit a request in Support or check your consents."
          action={(
            <div className="flex flex-wrap justify-center gap-3">
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
        <div className="grid gap-4 md:grid-cols-2">
          {cases.map((item) => (
            <Link
              key={item.id}
              href={`/cases/${item.id}`}
              className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={`Open case ${item.caseNumber ?? item.id}`}
            >
              <Card className="h-full">
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <CardTitle className="text-lg">{item.caseType ?? 'Support case'}</CardTitle>
                    <CardDescription>Case #{item.caseNumber ?? item.id}</CardDescription>
                    <p className="text-sm text-muted-foreground">Case manager: {item.caseManagerName}</p>
                  </div>
                  <span className="capitalize">
                    {item.status ?? 'active'}
                  </span>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-foreground/80">
                  <p>Priority: {item.priority ?? 'standard'}</p>
                  <p>Started: {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'Pending'}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
