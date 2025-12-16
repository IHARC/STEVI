import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import type { Database } from '@/types/supabase';
import { CreateOrganizationDialog } from './create-organization-dialog';
import { createOrganizationAction } from './actions';

type OrganizationRow = Pick<
  Database['core']['Tables']['organizations']['Row'],
  | 'id'
  | 'name'
  | 'website'
  | 'organization_type'
  | 'partnership_type'
  | 'status'
  | 'is_active'
  | 'services_tags'
  | 'updated_at'
>;

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: string | null) {
  if (!value) return 'Never';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export default async function OpsOrganizationsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/ops/organizations');
  }

  if (!access.canAccessOpsFrontline && !access.canAccessOpsOrg && !access.canAccessOpsAdmin && !access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const isInternalIharc = access.iharcRoles.length > 0;
  const canManageOrganizations = access.canAccessOpsSteviAdmin;
  const orgScopedViewer = !canManageOrganizations && !isInternalIharc;
  const visibleOrgId = orgScopedViewer ? access.organizationId : null;
  const organizations = visibleOrgId === null && orgScopedViewer ? [] : await fetchOrganizations(supabase, visibleOrgId);
  const canOpenOrganizations = canManageOrganizations || isInternalIharc || access.canAccessOpsOrg;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Organizations"
        description="Browse partner organizations. IHARC admins can create, update, and retire organizations."
      />

      {organizations.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">No partners yet</CardTitle>
              <CardDescription>Add partner orgs to surface in referrals and destination selection.</CardDescription>
            </div>
            {canManageOrganizations ? <CreateOrganizationDialog action={createOrganizationAction} /> : null}
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Organizations</CardTitle>
              <CardDescription>Browse partner details and open a specific organization to manage settings.</CardDescription>
            </div>
            {canManageOrganizations ? <CreateOrganizationDialog action={createOrganizationAction} /> : null}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Partnership</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id} className={org.is_active === false ? 'opacity-60' : undefined}>
                    <TableCell className="font-medium">
                      {canOpenOrganizations ? (
                        <Link
                          href={`/ops/organizations/${org.id}`}
                          className="text-foreground underline-offset-4 hover:underline"
                        >
                          {org.name}
                        </Link>
                      ) : (
                        org.name
                      )}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {org.organization_type?.replaceAll('_', ' ') ?? 'Not set'}
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {org.partnership_type?.replaceAll('_', ' ') ?? 'Not set'}
                    </TableCell>
                    <TableCell>
                      <ServiceTags services={org.services_tags} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(org.updated_at ?? null)}</TableCell>
                    <TableCell>
                      {org.website ? (
                        <a
                          href={org.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {org.website}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={resolveStatusVariant(org.status, org.is_active)} className="capitalize">
                        {org.status ?? (org.is_active === false ? 'inactive' : 'active')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function fetchOrganizations(
  supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>,
  onlyOrganizationId: number | null,
): Promise<OrganizationRow[]> {
  const core = supabase.schema('core');
  let query = core
    .from('organizations')
    .select('id, name, website, organization_type, partnership_type, status, is_active, services_tags, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (onlyOrganizationId !== null) {
    query = query.eq('id', onlyOrganizationId);
  }

  const { data, error } = await query;

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
  if (!list.length) return <span className="text-muted-foreground">—</span>;

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
