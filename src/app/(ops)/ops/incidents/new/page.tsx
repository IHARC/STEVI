import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';

export const dynamic = 'force-dynamic';

export default async function NewIncidentPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/auth/start?next=/ops/incidents/new');
  }

  if (!access.canAccessCfs) {
    redirect(resolveLandingPath(access));
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Incidents"
        title="Create an incident"
        description="Incidents are typically created from a call for service so intake and dispatch stay connected."
        primaryAction={{ label: 'Open CFS queue', href: '/ops/cfs' }}
        secondaryAction={{ label: 'Back to incidents', href: '/ops/incidents' }}
        breadcrumbs={[{ label: 'Incidents', href: '/ops/incidents' }, { label: 'New incident' }]}
      />

      <Card className="border-dashed border-border/70">
        <CardHeader>
          <CardTitle className="text-xl">Start from a call for service</CardTitle>
          <CardDescription>Convert a call to an incident to keep intake, triage, and response history linked.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>Use the CFS queue to triage and dispatch. Once converted, the incident record is created automatically.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1">
              <Link href="/ops/cfs">Go to CFS queue</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/ops/cfs/new">Create a call</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
