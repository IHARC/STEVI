import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchClientCaseActivities, fetchClientCaseDetail } from '@/lib/cases/fetchers';
import { submitClientCaseUpdateAction } from '@/lib/cases/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Textarea } from '@shared/ui/textarea';
import { Label } from '@shared/ui/label';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

type CasePageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { caseId } = await params;
  const parsedId = Number.parseInt(caseId, 10);
  if (!parsedId || Number.isNaN(parsedId)) {
    notFound();
  }

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);
  if (!access) redirect(`/auth/start?next=/cases/${caseId}`);
  if (!access.isProfileApproved) {
    redirect(resolveLandingPath(access));
  }

  const detail = await fetchClientCaseDetail(supabase, access.userId, parsedId);
  if (!detail) notFound();

  const activities = await fetchClientCaseActivities(supabase, detail.personId, 25);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Case #{detail.caseNumber ?? detail.id}</p>
          <h1 className="text-3xl text-foreground sm:text-4xl">{detail.caseType ?? 'Support case'}</h1>
          <p className="text-sm text-muted-foreground">Managed by {detail.caseManagerName}</p>
        </div>
        <Badge variant={detail.status === 'active' ? 'default' : 'secondary'} className="capitalize">
          {detail.status ?? 'active'}
        </Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Timeline</CardTitle>
            <CardDescription>Updates that your case manager marked as shareable with you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No client-visible updates yet.</p>
            ) : (
              <ul className="space-y-3">
                {activities.map((item) => (
                  <li key={item.id} className="rounded-xl border border-border/30 bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base text-foreground">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.activityType}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.activityDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {item.createdByOrg ? (
                        <Badge variant="outline" className="border-border/70">
                          Created by {item.createdByOrg}
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="border-border/70">
                        Shared with you
                      </Badge>
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-sm text-foreground/80">{item.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Send an update</CardTitle>
            <CardDescription>Share new info or changes. Your case manager will follow up using your consent settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientUpdateForm caseId={detail.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClientUpdateForm({ caseId }: { caseId: number }) {
  'use client';

  const action = submitClientCaseUpdateAction;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="case_id" value={caseId} />
      <div className="grid gap-1">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={4} placeholder="Share an update for your worker" required minLength={8} />
      </div>
      <Button type="submit" className="w-full">Send update</Button>
    </form>
  );
}
