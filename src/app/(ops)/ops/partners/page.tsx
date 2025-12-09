import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import type { Database } from '@/types/supabase';

type OrganizationRow = Pick<
  Database['core']['Tables']['organizations']['Row'],
  'id' | 'name' | 'website' | 'organization_type' | 'partnership_type' | 'status' | 'is_active' | 'services_tags'
>;

export const dynamic = 'force-dynamic';

export default async function OpsPartnersPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/partners');
  }

  if (!access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const organizations = await fetchOrganizations(supabase);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="Operations"
        title="Partners"
        description="Directory, services catalog, and agreements. Referrals start from a Visit or client profile."
        secondaryAction={{ label: 'Manage org hub', href: '/ops/org' }}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations.map((org) => (
          <Card key={org.id} className="h-full">
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-lg">{org.name}</CardTitle>
                <Badge variant={resolveStatusVariant(org.status, org.is_active)} className="capitalize">
                  {org.status ?? (org.is_active === false ? 'inactive' : 'active')}
                </Badge>
              </div>
              <CardDescription className="capitalize">{org.organization_type?.replaceAll('_', ' ') ?? 'Type not set'}</CardDescription>
              <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                <Badge variant="outline" className="capitalize">
                  {org.partnership_type?.replaceAll('_', ' ') ?? 'Partnership pending'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/80">
              <ServiceTags services={org.services_tags} />
              {org.website ? (
                <a href={org.website} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                  Visit website
                </a>
              ) : (
                <p className="text-muted-foreground">Website not provided.</p>
              )}
              <Button asChild variant="outline" className="w-full">
                <Link href={`/ops/org?orgId=${org.id}`}>Manage agreements</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {organizations.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">No partners yet</CardTitle>
              <CardDescription>Add partner orgs to surface in referrals and destination selection.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

async function fetchOrganizations(supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>): Promise<OrganizationRow[]> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from('organizations')
    .select('id, name, website, organization_type, partnership_type, status, is_active, services_tags')
    .order('name');

  if (error) throw error;
  return (data ?? []) as OrganizationRow[];
}

function resolveStatusVariant(status: OrganizationRow['status'], isActive: boolean | null) {
  if (isActive === false || status === 'inactive') return 'secondary';
  if (status === 'pending' || status === 'under_review') return 'outline';
  return 'default';
}

function ServiceTags({ services }: { services: unknown }) {
  const list = Array.isArray(services) ? services : [];
  if (!list.length) return <p className="text-muted-foreground">Services not documented yet.</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((item, idx) => (
        <Badge key={`${item}-${idx}`} variant="outline" className="text-xs capitalize">
          {String(item).replaceAll('_', ' ')}
        </Badge>
      ))}
    </div>
  );
}
