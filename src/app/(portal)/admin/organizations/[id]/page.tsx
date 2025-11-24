import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import {
  updateOrganizationAction,
  deleteOrganizationAction,
  attachOrgMemberAction,
  adminToggleOrgMemberRoleAction,
  adminRemoveOrgMemberAction,
} from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { extractOrgFeatureFlags, ORG_FEATURE_OPTIONS } from '@/lib/organizations';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

type Organization = Database['core']['Tables']['organizations']['Row'];
type PortalProfile = Database['portal']['Tables']['profiles']['Row'];

type Member = PortalProfile & { portal_roles: string[] };

const LIST_PATH = '/admin/organizations';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function statusBadgeVariant(status: Organization['status'], isActive: boolean | null) {
  if (isActive === false || status === 'inactive') return 'secondary';
  if (status === 'pending' || status === 'under_review') return 'outline';
  return 'default';
}

type RouteParams = { id: string };

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: RouteParams | Promise<RouteParams>;
}) {
  const resolvedParams = await params;
  const organizationId = Number.parseInt(resolvedParams.id, 10);
  if (Number.isNaN(organizationId)) {
    redirect(LIST_PATH);
  }

  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=${LIST_PATH}/${resolvedParams.id}`);
  }

  if (!access.canAccessAdminWorkspace || !access.portalRoles.includes('portal_admin')) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const core = supabase.schema('core');
  const portal = supabase.schema('portal');

  const { data: organization, error: orgError } = await core
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgError) {
    throw orgError;
  }

  if (!organization) {
    redirect(LIST_PATH);
  }

  const { data: memberProfiles, error: memberError } = await portal
    .from('profiles')
    .select('id, user_id, display_name, position_title, organization_id, last_seen_at, affiliation_status')
    .eq('organization_id', organizationId)
    .order('display_name');

  if (memberError) {
    throw memberError;
  }

  const membersList = (memberProfiles ?? []) as PortalProfile[];
  const userIds = membersList.map((member) => member.user_id).filter((id): id is string => Boolean(id));

  let roleMap = new Map<string, string[]>();
  if (userIds.length) {
    const { data: roleRows, error: roleError } = await supabase
      .schema('core')
      .from('user_roles')
      .select('user_id, roles:roles!inner(name)')
      .in('user_id', userIds);

    if (roleError) {
      throw roleError;
    }

    (roleRows ?? []).forEach((row: { user_id: string; roles: { name: string } | null }) => {
      const roleName = row.roles?.name;
      if (!roleName) return;
      const existingRoles = roleMap.get(row.user_id) ?? [];
      existingRoles.push(roleName);
      roleMap.set(row.user_id, existingRoles);
    });
  }

  const members: Member[] = membersList.map((member) => ({
    ...member,
    portal_roles: (roleMap.get(member.user_id ?? '') ?? []).filter((role) => role.startsWith('portal_')),
  }));

  const featureFlags = extractOrgFeatureFlags(organization.services_tags);

  const handleUpdate = async (formData: FormData) => {
    'use server';
    const result = await updateOrganizationAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleDelete = async (formData: FormData) => {
    'use server';
    const result = await deleteOrganizationAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
    redirect('/admin/organizations');
  };

  const handleAttachMember = async (formData: FormData) => {
    'use server';
    const result = await attachOrgMemberAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleToggleRole = async (formData: FormData) => {
    'use server';
    const result = await adminToggleOrgMemberRoleAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleRemoveMember = async (formData: FormData) => {
    'use server';
    const result = await adminRemoveOrgMemberAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const statusLabel = organization.status ?? (organization.is_active === false ? 'inactive' : 'active');

  return (
    <div className="space-y-space-lg">
      <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-space-2xs">
          <p className="text-label-sm font-medium uppercase text-muted-foreground">Admin · Organizations</p>
          <div className="flex items-center gap-space-sm">
            <h1 className="text-headline-lg text-on-surface">{organization.name}</h1>
            <Badge variant={statusBadgeVariant(organization.status, organization.is_active)}>
              {statusLabel?.replace(/_/g, ' ')}
            </Badge>
          </div>
          <p className="text-body-sm text-muted-foreground">
            Manage organization metadata, feature availability, and member/admin roles. All writes are audited and enforced by Supabase RLS.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/organizations">Back to list</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization profile</CardTitle>
          <CardDescription>Update core details, contact info, and feature availability.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleUpdate} className="grid gap-space-md lg:grid-cols-2">
            <input type="hidden" name="organization_id" value={organization.id} />
            <div className="space-y-space-xs">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required defaultValue={organization.name} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={organization.status ?? 'active'}>
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
              <Select name="organization_type" defaultValue={organization.organization_type ?? undefined}>
                <SelectTrigger id="organization_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {[
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
                  ].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-space-xs">
              <Label htmlFor="partnership_type">Partnership type</Label>
              <Select name="partnership_type" defaultValue={organization.partnership_type ?? undefined}>
                <SelectTrigger id="partnership_type">
                  <SelectValue placeholder="Select partnership" />
                </SelectTrigger>
                <SelectContent>
                  {['referral_partner', 'service_provider', 'funding_partner', 'collaborative_partner', 'resource_partner', 'other'].map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {value.replace(/_/g, ' ')}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-space-xs">
              <Label htmlFor="website">Website</Label>
              <Input id="website" name="website" type="url" defaultValue={organization.website ?? ''} placeholder="https://example.org" />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={organization.email ?? ''} placeholder="team@example.org" />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={organization.phone ?? ''} placeholder="+1 (905) 555-1234" />
            </div>
            <div className="space-y-space-xs">
              <Label className="flex items-center gap-space-xs text-body-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={organization.is_active ?? true}
                  className="h-4 w-4 rounded border border-input"
                />
                <span>Active</span>
              </Label>
            </div>

            <div className="space-y-space-xs">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={organization.description ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="services_provided">Services provided</Label>
              <Textarea
                id="services_provided"
                name="services_provided"
                defaultValue={organization.services_provided ?? ''}
                placeholder="Key programs, supports, or resources offered"
              />
            </div>

            <div className="space-y-space-xs">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={organization.address ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={organization.city ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="province">Province</Label>
              <Input id="province" name="province" defaultValue={organization.province ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="postal_code">Postal code</Label>
              <Input id="postal_code" name="postal_code" defaultValue={organization.postal_code ?? ''} />
            </div>

            <div className="space-y-space-xs">
              <Label htmlFor="contact_person">Primary contact</Label>
              <Input id="contact_person" name="contact_person" defaultValue={organization.contact_person ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="contact_title">Contact title</Label>
              <Input id="contact_title" name="contact_title" defaultValue={organization.contact_title ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="contact_phone">Contact phone</Label>
              <Input id="contact_phone" name="contact_phone" defaultValue={organization.contact_phone ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="contact_email">Contact email</Label>
              <Input id="contact_email" name="contact_email" type="email" defaultValue={organization.contact_email ?? ''} />
            </div>

            <div className="space-y-space-xs">
              <Label htmlFor="operating_hours">Operating hours</Label>
              <Textarea id="operating_hours" name="operating_hours" defaultValue={organization.operating_hours ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="availability_notes">Availability notes</Label>
              <Textarea id="availability_notes" name="availability_notes" defaultValue={organization.availability_notes ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="referral_process">Referral process</Label>
              <Textarea id="referral_process" name="referral_process" defaultValue={organization.referral_process ?? ''} />
            </div>
            <div className="space-y-space-xs">
              <Label htmlFor="special_requirements">Special requirements</Label>
              <Textarea id="special_requirements" name="special_requirements" defaultValue={organization.special_requirements ?? ''} />
            </div>
            <div className="space-y-space-xs lg:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={organization.notes ?? ''} />
            </div>

            <div className="lg:col-span-2 space-y-space-xs">
              <Label className="text-body-sm">Feature availability</Label>
              <div className="mt-space-sm grid gap-space-xs md:grid-cols-3">
                {ORG_FEATURE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-space-xs rounded-md border border-outline/20 px-space-sm py-space-xs text-body-sm"
                  >
                    <input
                      type="checkbox"
                      name="features"
                      value={option.value}
                      defaultChecked={featureFlags.includes(option.value)}
                      className="h-4 w-4 rounded border border-input"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members & admins</CardTitle>
          <CardDescription>Link profiles to this organization and control portal roles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-space-lg">
          <form action={handleAttachMember} className="grid gap-space-md md:grid-cols-4">
            <input type="hidden" name="organization_id" value={organization.id} />
            <div className="space-y-space-xs md:col-span-2">
              <Label htmlFor="profile_id">Profile ID</Label>
              <Input id="profile_id" name="profile_id" required placeholder="Profile UUID" />
              <p className="text-label-sm text-muted-foreground">Find the profile in verification or profiles list first.</p>
            </div>
            <div className="space-y-space-xs">
              <Label className="flex items-center gap-space-xs text-body-sm">
                <input type="checkbox" name="make_admin" className="h-4 w-4 rounded border border-input" />
                <span>Make org admin</span>
              </Label>
            </div>
            <div className="space-y-space-xs">
              <Label className="flex items-center gap-space-xs text-body-sm">
                <input type="checkbox" name="make_rep" defaultChecked className="h-4 w-4 rounded border border-input" />
                <span>Give org rep access</span>
              </Label>
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button type="submit" variant="outline">
                Add member
              </Button>
            </div>
          </form>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No members yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((member) => {
                    const isOrgAdmin =
                      member.portal_roles.includes('portal_org_admin') || member.portal_roles.includes('portal_admin');
                    const isOrgRep = member.portal_roles.includes('portal_org_rep');
                    const isSelf = member.id === access.profile.id;

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-on-surface">{member.display_name}</span>
                            {member.position_title ? (
                              <span className="text-xs text-muted-foreground">{member.position_title}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-space-2xs">
                            {isOrgAdmin ? <Badge>Org admin</Badge> : null}
                            {isOrgRep ? (
                              <Badge variant={isOrgAdmin ? 'outline' : 'secondary'}>Org rep</Badge>
                            ) : null}
                            {!isOrgAdmin && !isOrgRep ? <Badge variant="outline">portal_user</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {member.affiliation_status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(member.last_seen_at)}</TableCell>
                        <TableCell className="flex justify-end gap-space-xs">
                          <form action={handleToggleRole}>
                            <input type="hidden" name="organization_id" value={organization.id} />
                            <input type="hidden" name="profile_id" value={member.id} />
                            <input type="hidden" name="role_name" value="portal_org_admin" />
                            <input type="hidden" name="enable" value={(!isOrgAdmin).toString()} />
                            <Button type="submit" size="sm" variant={isOrgAdmin ? 'outline' : 'default'} disabled={isSelf && isOrgAdmin}>
                              {isOrgAdmin ? 'Remove admin' : 'Make admin'}
                            </Button>
                          </form>
                          <form action={handleToggleRole}>
                            <input type="hidden" name="organization_id" value={organization.id} />
                            <input type="hidden" name="profile_id" value={member.id} />
                            <input type="hidden" name="role_name" value="portal_org_rep" />
                            <input type="hidden" name="enable" value={(!isOrgRep).toString()} />
                            <Button type="submit" size="sm" variant={isOrgRep ? 'outline' : 'secondary'} disabled={isSelf && isOrgAdmin}>
                              {isOrgRep ? 'Remove rep' : 'Make rep'}
                            </Button>
                          </form>
                          <form action={handleRemoveMember}>
                            <input type="hidden" name="organization_id" value={organization.id} />
                            <input type="hidden" name="profile_id" value={member.id} />
                            <Button type="submit" size="sm" variant="ghost" disabled={isSelf}>
                              Remove
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>Delete the organization after detaching all linked members and invites.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleDelete} className="grid gap-space-md md:grid-cols-3 md:items-end">
            <input type="hidden" name="organization_id" value={organization.id} />
            <div className="space-y-space-xs md:col-span-2">
              <Label htmlFor="confirm_name">Type the organization name to confirm</Label>
              <Input id="confirm_name" name="confirm_name" placeholder={organization.name} />
            </div>
            <div className="md:col-span-1 flex justify-end">
              <Button type="submit" variant="destructive">
                Delete organization
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
