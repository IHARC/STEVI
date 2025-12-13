import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { extractOrgFeatureFlags, ORG_FEATURE_OPTIONS } from '@/lib/organizations';
import { fetchOrgMembersWithRoles } from '@/lib/org/fetchers';
import type { Database } from '@/types/supabase';
import { PageHeader } from '@shared/layout/page-header';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { Separator } from '@shared/ui/separator';
import { OrgMembersTable } from '../../../org/members/org-members-table';
import {
  attachOrgMemberAction,
  deleteOrganizationAction,
  updateOrganizationAction,
} from '../actions';

export const dynamic = 'force-dynamic';

type OrganizationRow = Database['core']['Tables']['organizations']['Row'];

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

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  pending: 'outline',
  under_review: 'outline',
  inactive: 'secondary',
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminOrganizationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const organizationId = Number.parseInt(id, 10);

  if (!Number.isFinite(organizationId)) {
    redirect('/ops/admin/organizations');
  }

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access || !access.canAccessOpsSteviAdmin) {
    redirect(resolveLandingPath(access));
  }

  const [{ data: orgRow, error: orgError }, members] = await Promise.all([
    supabase
      .schema('core')
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .maybeSingle(),
    fetchOrgMembersWithRoles(supabase, organizationId),
  ]);

  if (orgError) throw orgError;
  if (!orgRow) {
    redirect('/ops/admin/organizations');
  }

  const selectedFeatures = extractOrgFeatureFlags(orgRow.services_tags);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title={orgRow.name ?? 'Organization'}
        description="IHARC-wide administration for this tenant. Update details, feature flags, and membership."
        breadcrumbs={[
          { label: 'STEVI Admin', href: '/ops/admin' },
          { label: 'Organizations', href: '/ops/admin/organizations' },
          { label: orgRow.name ?? 'Organization' },
        ]}
        secondaryAction={{ label: 'View org hub', href: `/ops/org?orgId=${organizationId}` }}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant={STATUS_BADGE[orgRow.status ?? 'active'] ?? 'outline'} className="capitalize">
            {orgRow.status ?? 'active'}
          </Badge>
          <Badge variant={orgRow.is_active ? 'secondary' : 'outline'}>{orgRow.is_active ? 'Active' : 'Inactive'}</Badge>
        </div>
      </PageHeader>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Organization details</CardTitle>
            <CardDescription>Edit core attributes, services, and contact details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              action={async (formData) => {
                await updateOrganizationAction(formData);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="organization_id" value={organizationId} />

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Name" id="name">
                  <Input id="name" name="name" defaultValue={orgRow.name ?? ''} required />
                </Field>
                <Field label="Website" id="website">
                  <Input id="website" name="website" type="url" defaultValue={orgRow.website ?? ''} placeholder="https://example.org" />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Status" id="status">
                  <select id="status" name="status" defaultValue={orgRow.status ?? 'active'} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {STATUS_OPTIONS.map((value) => (
                      <option key={value} value={value ?? ''}>
                        {value?.replaceAll('_', ' ') ?? 'active'}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Organization type" id="organization_type">
                  <select
                    id="organization_type"
                    name="organization_type"
                    defaultValue={orgRow.organization_type ?? ''}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Not set</option>
                    {ORG_TYPE_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Partnership type" id="partnership_type">
                  <select
                    id="partnership_type"
                    name="partnership_type"
                    defaultValue={orgRow.partnership_type ?? ''}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Not set</option>
                    {PARTNERSHIP_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="flex items-center gap-2">
                <input id="is_active" name="is_active" type="checkbox" defaultChecked={orgRow.is_active ?? false} className="h-4 w-4" />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Contact person" id="contact_person">
                  <Input id="contact_person" name="contact_person" defaultValue={orgRow.contact_person ?? ''} />
                </Field>
                <Field label="Contact title" id="contact_title">
                  <Input id="contact_title" name="contact_title" defaultValue={orgRow.contact_title ?? ''} />
                </Field>
                <Field label="Contact email" id="contact_email">
                  <Input id="contact_email" name="contact_email" type="email" defaultValue={orgRow.contact_email ?? ''} />
                </Field>
                <Field label="Contact phone" id="contact_phone">
                  <Input id="contact_phone" name="contact_phone" defaultValue={orgRow.contact_phone ?? ''} />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Address" id="address" className="md:col-span-2">
                  <Input id="address" name="address" defaultValue={orgRow.address ?? ''} />
                </Field>
                <Field label="City" id="city">
                  <Input id="city" name="city" defaultValue={orgRow.city ?? ''} />
                </Field>
                <Field label="Province" id="province">
                  <Input id="province" name="province" defaultValue={orgRow.province ?? ''} />
                </Field>
                <Field label="Postal code" id="postal_code">
                  <Input id="postal_code" name="postal_code" defaultValue={orgRow.postal_code ?? ''} />
                </Field>
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Services provided" id="services_provided">
                  <Textarea id="services_provided" name="services_provided" defaultValue={orgRow.services_provided ?? ''} rows={3} />
                </Field>
                <Field label="Referral process" id="referral_process">
                  <Textarea id="referral_process" name="referral_process" defaultValue={orgRow.referral_process ?? ''} rows={3} />
                </Field>
                <Field label="Special requirements" id="special_requirements">
                  <Textarea id="special_requirements" name="special_requirements" defaultValue={orgRow.special_requirements ?? ''} rows={3} />
                </Field>
                <Field label="Availability notes" id="availability_notes">
                  <Textarea id="availability_notes" name="availability_notes" defaultValue={orgRow.availability_notes ?? ''} rows={3} />
                </Field>
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Operating hours" id="operating_hours">
                  <Input id="operating_hours" name="operating_hours" defaultValue={orgRow.operating_hours ?? ''} />
                </Field>
                <Field label="Phone" id="phone">
                  <Input id="phone" name="phone" defaultValue={orgRow.phone ?? ''} />
                </Field>
                <Field label="Email" id="email">
                  <Input id="email" name="email" type="email" defaultValue={orgRow.email ?? ''} />
                </Field>
                <Field label="Description" id="description">
                  <Textarea id="description" name="description" defaultValue={orgRow.description ?? ''} rows={3} />
                </Field>
              </div>

              <div className="space-y-2">
                <Label>Features</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ORG_FEATURE_OPTIONS.map((feature) => (
                    <label key={feature.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="features"
                        value={feature.value}
                        className="h-4 w-4"
                        defaultChecked={selectedFeatures.includes(feature.value)}
                      />
                      <span>{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notes (internal)</Label>
                <Textarea id="notes" name="notes" defaultValue={orgRow.notes ?? ''} rows={3} />
              </div>

              <div className="flex justify-end">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-xl">Quick facts</CardTitle>
              <CardDescription>Snapshots staff may need when coordinating.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground/80">
              <Fact label="Website">
                {orgRow.website ? (
                  <a href={orgRow.website} className="text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                    {orgRow.website}
                  </a>
                ) : (
                  'Not provided'
                )}
              </Fact>
              <Fact label="Contact">
                {orgRow.contact_person ? `${orgRow.contact_person}${orgRow.contact_title ? `, ${orgRow.contact_title}` : ''}` : 'Not set'}
                <br />
                {orgRow.contact_email ?? '—'}
                <br />
                {orgRow.contact_phone ?? '—'}
              </Fact>
              <Fact label="Partnership type">{orgRow.partnership_type?.replaceAll('_', ' ') ?? 'Not set'}</Fact>
              <Fact label="Features">
                {selectedFeatures.length ? (
                  <div className="flex flex-wrap gap-1">
                    {selectedFeatures.map((feature) => (
                      <Badge key={feature} variant="outline" className="capitalize">
                        {feature.replaceAll('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  'None enabled'
                )}
              </Fact>
            </CardContent>
          </Card>

          <Card className="border-destructive/40 border">
            <CardHeader>
              <CardTitle className="text-xl text-destructive">Delete organization</CardTitle>
              <CardDescription>Permanently remove this organization after clearing all memberships and links.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                action={async (formData) => {
                  await deleteOrganizationAction(formData);
                }}
                className="space-y-3"
              >
                <input type="hidden" name="organization_id" value={organizationId} />
                <div className="space-y-1">
                  <Label htmlFor="confirm_name">Type the organization name to confirm</Label>
                  <Input id="confirm_name" name="confirm_name" placeholder={orgRow.name ?? 'Organization name'} />
                </div>
                <Button type="submit" variant="destructive">
                  Delete organization
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Members & roles</CardTitle>
            <CardDescription>IHARC admins can manage any tenant’s membership directly.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <OrgMembersTable members={members} currentProfileId={access.profile.id} organizationId={organizationId} />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Attach member</CardTitle>
            <CardDescription>Link an existing profile and optionally grant org roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={async (formData) => {
                await attachOrgMemberAction(formData);
              }}
              className="space-y-3"
            >
              <input type="hidden" name="organization_id" value={organizationId} />
              <div className="space-y-1">
                <Label htmlFor="profile_id">Profile ID</Label>
                <Input id="profile_id" name="profile_id" placeholder="profile UUID" required />
                <p className="text-xs text-muted-foreground">Find profile IDs from the STEVI Admin Users list.</p>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="make_admin" className="h-4 w-4" />
                  <span>Grant org admin</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="make_rep" className="h-4 w-4" defaultChecked />
                  <span>Grant org representative</span>
                </label>
              </div>
              <Button type="submit">Attach member</Button>
              <p className="text-xs text-muted-foreground">Membership changes are audit logged and refresh user claims.</p>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Field({ id, label, children, className }: { id: string; label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className ?? 'space-y-1'}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}
