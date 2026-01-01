import { notFound, redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchClientCaseDetail, fetchClientTimelineEvents } from '@/lib/cases/fetchers';
import type { TimelineEvent } from '@/lib/timeline/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { ClientUpdateForm } from '@/components/client/cases/client-update-form';

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

  const events = await fetchClientTimelineEvents(supabase, detail.personId, 25);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Case #{detail.caseNumber ?? detail.id}</p>
          <h1 className="text-3xl text-foreground sm:text-4xl">{detail.caseType ?? 'Support case'}</h1>
          <p className="text-sm text-muted-foreground">Managed by {detail.caseManagerName}</p>
        </div>
        <span className="capitalize">
          {detail.status ?? 'active'}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg">Timeline</CardTitle>
            <CardDescription>Updates that your case manager marked as shareable with you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No client-visible updates yet.</p>
            ) : (
              <ul className="space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="rounded-xl border border-border/30 bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base text-foreground">{event.summary ?? 'Timeline update'}</p>
                        <p className="text-sm text-muted-foreground">{formatCategory(event.eventCategory)}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.eventAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {event.createdByOrg ? (
                        <span className="border-border/70">
                          Created by {event.createdByOrg}
                        </span>
                      ) : null}
                      <span className="border-border/70">
                        Shared with you
                      </span>
                    </div>
                    {resolveEventDetail(event) ? (
                      <p className="mt-1 text-sm text-foreground/80">{resolveEventDetail(event)}</p>
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

function resolveEventDetail(event: TimelineEvent): string | null {
  const meta = event.metadata ?? {};
  const candidates = [meta.description, meta.notes, meta.message, meta.summary];
  for (const entry of candidates) {
    if (typeof entry === 'string' && entry.trim().length > 0) return entry;
  }
  return null;
}

function formatCategory(category: string) {
  return category.replaceAll('_', ' ');
}
