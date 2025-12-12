import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { extractOrgFeatureFlags, ORG_FEATURE_OPTIONS } from '@/lib/organizations';
import type { Database } from '@/types/supabase';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { createOrganizationAction } from './actions';

export const dynamic = 'force-dynamic';

type OrganizationRow = Pick<
  Database['core']['Tables']['organizations']['Row'],
  'id' | 'name' | 'status' | 'organization_type' | 'partnership_type' | 'website' | 'updated_at' | 'is_active' | 'services_tags'
>;

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  pending: 'outline',
  under_review: 'outline',
  inactive: 'secondary',
};

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

export default async function AdminOrganizationsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const { data: orgRows, error } = await supabase
    .schema('core')
    .from('organizations')
    .select('id, name, status, organization_type, partnership_type, website, updated_at, is_active, services_tags')
    .order('updated_at', { ascending: false })
    .limit(120);

  if (error) {
    throw error;
  }

  const organizations: Array<OrganizationRow & { features: ReturnType<typeof extractOrgFeatureFlags> }> = (orgRows ?? []).map(
    (row: OrganizationRow) => ({
      ...row,
      features: extractOrgFeatureFlags(row.services_tags),
    }),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Organizations"
        description="Create and manage partner organizations across STEVI. IHARC admins can onboard and configure any tenant."
        primaryAction={{ label: 'New organization', href: '#create' }}
        secondaryAction={{ label: 'Back to STEVI Admin', href: '/ops/admin' }}
      />

      <section className="grid gap-3 lg:grid-cols-[1.1fr_1fr]" id="create">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">New organization</CardTitle>
            <CardDescription>Super admins only. All changes are audit logged.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={async (formData) => {
                await createOrganizationAction(formData);
              }}
              className="space-y-4"
            >
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
                  <select id="status" name="status" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {STATUS_OPTIONS.map((value) => (
                      <option key={value} value={value ?? ''}>
                        {value?.replaceAll('_', ' ') ?? 'active'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="organization_type">Organization type</Label>
                  <select
                    id="organization_type"
                    name="organization_type"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Not set</option>
                    {ORG_TYPE_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="partnership_type">Partnership type</Label>
                  <select
                    id="partnership_type"
                    name="partnership_type"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Not set</option>
                    {PARTNERSHIP_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ORG_FEATURE_OPTIONS.map((feature) => (
                    <label key={feature.value} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="features" value={feature.value} className="h-4 w-4" />
                      <span>{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input id="is_active" name="is_active" type="checkbox" defaultChecked className="h-4 w-4" />
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
            <CardTitle className="text-xl">How access works</CardTitle>
            <CardDescription>IHARC admins manage all orgs; org admins manage only their tenant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              IHARC admins (role <code>iharc_admin</code>) are the only super admins. The legacy <code>portal_admin</code> role is
              no longer used for authorization.
            </p>
            <p>
              Use this page to bootstrap new partners before assigning org admins and representatives. Feature flags control which
              modules surface for the tenant.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" id="list">
        {organizations.map((org: OrganizationRow & { features: string[] }) => (
          <Card key={org.id} className="border-border/60">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{org.name ?? 'Organization'}</CardTitle>
                  <CardDescription className="capitalize">
                    {org.organization_type?.replaceAll('_', ' ') ?? 'Type not set'}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  <Badge variant={STATUS_BADGE[org.status ?? 'active'] ?? 'outline'} className="capitalize">
                    {org.status ?? 'active'}
                  </Badge>
                  <Badge variant={org.is_active ? 'secondary' : 'outline'}>{org.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                {org.partnership_type ? <Badge variant="outline" className="capitalize">{org.partnership_type.replaceAll('_', ' ')}</Badge> : null}
                {org.features.map((feature) => (
                  <Badge key={feature} variant="outline" className="capitalize">
                    {feature.replaceAll('_', ' ')}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/80">
              <p className="text-xs text-muted-foreground">Updated {formatDate(org.updated_at ?? null)}</p>
              <div className="flex flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">Website</span>
                {org.website ? (
                  <a href={org.website} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                    {org.website}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </div>
              <Button asChild className="w-full" variant="outline">
            <Link href={`/ops/admin/organizations/${org.id}`}>Open</Link>
          </Button>
        </CardContent>
      </Card>
        ))}
        {organizations.length === 0 ? (
          <Card className="border-dashed border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">No organizations yet</CardTitle>
              <CardDescription>Create the first partner to get started.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
