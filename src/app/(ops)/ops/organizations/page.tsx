import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { ORG_FEATURE_OPTIONS } from '@/lib/organizations';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { NativeCheckbox } from '@shared/ui/native-checkbox';
import { NativeSelect } from '@shared/ui/native-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shared/ui/table';
import { Textarea } from '@shared/ui/textarea';
import type { Database } from '@/types/supabase';
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

const STATUS_OPTIONS: Array<OrganizationRow['status']> = ['active', 'inactive', 'pending', 'under_review'];
const ORG_TYPE_OPTIONS: Array<NonNullable<OrganizationRow['organization_type']>> = [
  'addiction',
  'crisis_support',
  'food_services',
  'housing',
  'mental_health',
  'multi_service',
  'healthcare',
  'government',
  'non_profit',
  'faith_based',
  'community_center',
  'legal_services',
  'other',
];

const PARTNERSHIP_OPTIONS: Array<NonNullable<OrganizationRow['partnership_type']>> = [
  'referral_partner',
  'service_provider',
  'funding_partner',
  'collaborative_partner',
  'resource_partner',
  'other',
];

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

  const canManageOrganizations = access.canAccessOpsSteviAdmin;
  const organizations = await fetchOrganizations(supabase);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Organizations"
        description="Browse partner organizations. IHARC admins can create, update, and retire organizations from a single hub."
        primaryAction={canManageOrganizations ? { label: 'New organization', href: '#create' } : undefined}
        secondaryAction={{ label: 'Open org hub', href: '/ops/org' }}
      />

      {canManageOrganizations ? (
        <section className="grid gap-3 lg:grid-cols-[1.1fr_1fr]" id="create">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-xl">New organization</CardTitle>
              <CardDescription>IHARC admins only. All changes are audit logged.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={createOrganizationAction} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" required placeholder="Organization name" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" name="website" type="url" placeholder="https://example.org" />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="status">Status</Label>
                    <NativeSelect id="status" name="status" defaultValue="active">
                      {STATUS_OPTIONS.map((value) => (
                        <option key={value} value={value ?? ''}>
                          {value?.replaceAll('_', ' ') ?? 'active'}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="organization_type">Organization type</Label>
                    <NativeSelect id="organization_type" name="organization_type">
                      <option value="">Not set</option>
                      {ORG_TYPE_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="partnership_type">Partnership type</Label>
                    <NativeSelect id="partnership_type" name="partnership_type">
                      <option value="">Not set</option>
                      {PARTNERSHIP_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Features</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ORG_FEATURE_OPTIONS.map((feature) => (
                      <label key={feature.value} className="flex items-center gap-2 text-sm">
                        <NativeCheckbox name="features" value={feature.value} />
                        <span>{feature.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <NativeCheckbox id="is_active" name="is_active" defaultChecked />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="notes">Notes (internal)</Label>
                  <Textarea id="notes" name="notes" placeholder="Internal notes for IHARC admins" rows={3} />
                </div>

                <Button type="submit">Create organization</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-xl">Notes</CardTitle>
              <CardDescription>Use organizations to power referrals, inventory attribution, and tenant access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Feature flags control which modules appear for the tenant once org admins sign in.</p>
              <p>Membership and role changes live inside each organization’s detail page.</p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {organizations.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">No partners yet</CardTitle>
            <CardDescription>Add partner orgs to surface in referrals and destination selection.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Organizations</CardTitle>
            <CardDescription>Browse partner details and open a specific organization to manage settings.</CardDescription>
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id} className={org.is_active === false ? 'opacity-60' : undefined}>
                    <TableCell className="font-medium">{org.name}</TableCell>
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
                    <TableCell className="text-right">
                      {canManageOrganizations ? (
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/ops/organizations/${org.id}`}>Open</Link>
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/ops/org?orgId=${org.id}`}>Org hub</Link>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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

async function fetchOrganizations(supabase: Awaited<ReturnType<typeof createSupabaseRSCClient>>): Promise<OrganizationRow[]> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from('organizations')
    .select('id, name, website, organization_type, partnership_type, status, is_active, services_tags, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);

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
