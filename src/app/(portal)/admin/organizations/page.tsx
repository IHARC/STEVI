import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { createOrganizationAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { extractOrgFeatureFlags, ORG_FEATURE_OPTIONS } from '@/lib/organizations';
import type { Database } from '@/types/supabase';
import { resolveLandingPath } from '@/lib/portal-navigation';

export const dynamic = 'force-dynamic';

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
>;

function statusVariant(status: OrganizationRow['status'], isActive: boolean | null) {
  if (isActive === false || status === 'inactive') return 'secondary';
  if (status === 'pending' || status === 'under_review') return 'outline';
  return 'default';
}

export default async function AdminOrganizationsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/organizations');
  }

  if (!access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);
  const core = supabase.schema('core');
  const { data: orgs, error } = await core
    .from('organizations')
    .select('id, name, website, organization_type, partnership_type, status, is_active, services_tags')
    .order('name');

  if (error) {
    throw error;
  }

  const handleCreate = async (formData: FormData) => {
    'use server';
    const result = await createOrganizationAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const organizations = (orgs ?? []) as OrganizationRow[];

  return (
    <div className="space-y-space-lg">
      <header className="space-y-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Admin</p>
        <h1 className="text-headline-lg">Organizations</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground">
          Create, edit, and review partner organizations. Admins can seed initial org admins so teams can self-manage members under RLS.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-lg">Create organization</CardTitle>
          <CardDescription>Set the basics now, refine details and feature access in the manage view.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-space-md md:grid-cols-3" action={handleCreate}>
            <div className="space-y-space-xs md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Community Food Bank" />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue="active">
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under review</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="organization_type">Organization type</Label>
              <Select name="organization_type">
                <SelectTrigger id="organization_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {['addiction', 'crisis_support', 'food_services', 'housing', 'mental_health', 'multi_service', 'healthcare', 'government', 'non_profit', 'faith_based', 'community_center', 'legal_services', 'other'].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="partnership_type">Partnership type</Label>
              <Select name="partnership_type">
                <SelectTrigger id="partnership_type">
                  <SelectValue placeholder="Select partnership" />
                </SelectTrigger>
                <SelectContent>
                  {['referral_partner', 'service_provider', 'funding_partner', 'collaborative_partner', 'resource_partner', 'other'].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" placeholder="https://example.org" />
            </div>
            <div className="space-y-space-xs">
              <Label className="flex items-center gap-space-xs text-body-sm">
                <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 rounded border border-input" />
                <span>Mark as active</span>
              </Label>
              <p className="text-label-sm text-muted-foreground">Unchecked organizations remain in draft.</p>
            </div>
            <div className="md:col-span-3">
              <Label className="text-body-sm">Feature availability</Label>
              <div className="mt-space-sm grid gap-space-xs sm:grid-cols-3">
                {ORG_FEATURE_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center gap-space-xs rounded-md border border-outline/20 px-space-sm py-space-xs text-body-sm">
                    <input type="checkbox" name="features" value={option.value} className="h-4 w-4 rounded border border-input" />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <Button type="submit">Create organization</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-title-lg">Organizations</CardTitle>
          <CardDescription>Manage details, features, and membership for each organization.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Partnership</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Features</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No organizations yet. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => {
                  const features = extractOrgFeatureFlags(org.services_tags);
                  const statusLabel = org.status ?? (org.is_active === false ? 'inactive' : 'active');

                  return (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-space-2xs">
                          <span className="text-on-surface">{org.name}</span>
                          {org.website ? (
                            <span className="text-label-sm text-muted-foreground">{org.website}</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {org.organization_type?.replace(/_/g, ' ') ?? '—'}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {org.partnership_type?.replace(/_/g, ' ') ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(org.status, org.is_active)}>
                          {statusLabel?.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {features.length ? (
                          <div className="flex flex-wrap gap-space-2xs">
                            {features.map((feature) => (
                              <Badge key={feature} variant="outline" className="capitalize">
                                {feature.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/organizations/${org.id}`}>Manage</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
