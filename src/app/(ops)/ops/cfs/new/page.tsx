import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { SupabaseRSCClient } from '@/lib/supabase/types';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchOrganizationsForSharing } from '@/lib/cfs/queries';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { CfsCreateForm } from '@/components/workspace/cfs/cfs-create-form';

export const dynamic = 'force-dynamic';

export default async function NewCfsCallPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase as SupabaseRSCClient);

  if (!access) {
    redirect('/auth/start?next=/ops/cfs/new');
  }

  if (!access.canCreateCfs) {
    redirect(resolveLandingPath(access));
  }

  if (!access.organizationId) {
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="Calls for service"
          title="Select an acting organization"
          description="Choose an organization before creating a call so the request is routed correctly."
          primaryAction={{ label: 'Select organization', href: '/ops/profile' }}
          secondaryAction={{ label: 'Back to queue', href: '/ops/cfs' }}
          breadcrumbs={[{ label: 'Calls for service', href: '/ops/cfs' }, { label: 'New call' }]}
          meta={[{ label: 'Org required', tone: 'warning' }]}
        />

        <Card className="border-dashed border-border/70">
          <CardHeader>
            <CardTitle className="text-xl">Acting org required</CardTitle>
            <CardDescription>Calls for service are routed and shared based on your active organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Select your acting organization in profile settings before creating a call. This keeps ownership and reporting accurate.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild className="flex-1">
                <Link href="/ops/profile">Open account settings</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/ops/cfs">Return to queue</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const organizations = await fetchOrganizationsForSharing(supabase);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Calls for service"
        title="New call"
        description="Capture outreach requests from the public, partner agencies, or staff observations."
        primaryAction={{ label: 'Back to queue', href: '/ops/cfs' }}
        breadcrumbs={[{ label: 'Calls for service', href: '/ops/cfs' }, { label: 'New call' }]}
        meta={[{ label: access.organizationName ?? 'Organization', tone: 'neutral' }]}
      />

      <CfsCreateForm organizations={organizations} canPublicTrack={access.canPublicTrackCfs} />
    </div>
  );
}
