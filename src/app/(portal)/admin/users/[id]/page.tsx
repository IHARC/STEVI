import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchAdminUserDetail } from '@/lib/admin-users';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateProfileAction, toggleRoleAction, archiveUserAction, sendInviteAction } from '../actions';

export const dynamic = 'force-dynamic';

const PORTAL_ROLES = [
  'portal_admin',
  'portal_org_admin',
  'portal_org_rep',
  'portal_user',
] as const;

type RouteParams = { id: string };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=/admin/users/${id}`);
  }
  if (!access.canAccessAdminWorkspace) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const detail = await fetchAdminUserDetail(supabase, id);

  if (!detail) {
    redirect('/admin/users');
  }

  const orgOptionsResponse = await supabase
    .schema('core')
    .from('organizations')
    .select('id, name')
    .order('name');

  if (orgOptionsResponse.error) {
    throw orgOptionsResponse.error;
  }

  const organizations =
    (orgOptionsResponse.data ?? []).map((org: { id: number; name: string }) => ({
      id: org.id,
      name: org.name,
    })) ?? [];

  const isInvitedOnly = !detail.profile.user_id;

  const updateProfile = async (formData: FormData) => {
    'use server';
    const result = await updateProfileAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const toggleRole = async (formData: FormData) => {
    'use server';
    const result = await toggleRoleAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const archiveUser = async (formData: FormData) => {
    'use server';
    const result = await archiveUserAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const sendInvite = async (formData: FormData) => {
    'use server';
    const result = await sendInviteAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  return (
    <div className="page-shell page-stack">
      <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-space-2xs">
          <p className="text-label-sm font-medium uppercase text-muted-foreground">Admin · User</p>
          <div className="flex flex-wrap items-center gap-space-xs">
            <h1 className="text-headline-lg text-on-surface">{detail.profile.display_name}</h1>
            <Badge variant={detail.profile.affiliation_status === 'approved' ? 'default' : detail.profile.affiliation_status === 'pending' ? 'outline' : 'secondary'}>
              {detail.profile.affiliation_status}
            </Badge>
            {detail.organization ? (
              <Badge variant="outline">{detail.organization.name}</Badge>
            ) : null}
          </div>
          <p className="text-body-sm text-muted-foreground">
            Manage profile details, portal roles, organization linkage, and review recent audit history.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/users/all">Back to list</Link>
        </Button>
      </div>

      <div className="grid gap-space-lg lg:grid-cols-3">
        <Card className="lg:col-span-2 border-outline/20 bg-surface-container">
          <CardHeader>
            <CardTitle>Profile & affiliation</CardTitle>
            <CardDescription>Update visible details and organizational context.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProfile} className="grid gap-space-md md:grid-cols-2">
              <input type="hidden" name="profile_id" value={detail.profile.id} />
              <div className="space-y-space-2xs md:col-span-2">
                <Label htmlFor="display_name">Display name</Label>
                <Input id="display_name" name="display_name" defaultValue={detail.profile.display_name} required />
              </div>
              <div className="space-y-space-2xs md:col-span-2">
                <Label htmlFor="position_title">Title / role</Label>
                <Input
                  id="position_title"
                  name="position_title"
                  defaultValue={detail.profile.position_title ?? ''}
                  placeholder="Case worker, partner lead, etc."
                />
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor="affiliation_type">Affiliation type</Label>
                <select
                  id="affiliation_type"
                  name="affiliation_type"
                  defaultValue={detail.profile.affiliation_type}
                  className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm"
                >
                  <option value="community_member">Client / community member</option>
                  <option value="agency_partner">Agency partner</option>
                  <option value="government_partner">Government partner</option>
                </select>
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor="affiliation_status">Status</Label>
                <select
                  id="affiliation_status"
                  name="affiliation_status"
                  defaultValue={detail.profile.affiliation_status}
                  className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor="organization_id">Organization</Label>
                <select
                  id="organization_id"
                  name="organization_id"
                  defaultValue={detail.organization?.id ?? ''}
                  className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm"
                >
                  <option value="">No organization</option>
                  {organizations.map((org: { id: number; name: string }) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor="government_role_type">Government role</Label>
                <select
                  id="government_role_type"
                  name="government_role_type"
                  defaultValue={detail.profile.government_role_type ?? ''}
                  className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm"
                >
                  <option value="">Not applicable</option>
                  <option value="staff">Staff</option>
                  <option value="politician">Politician</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end gap-space-xs">
                <Button type="submit">Save changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-outline/20 bg-surface-container">
          <CardHeader>
            <CardTitle>Portal roles</CardTitle>
            <CardDescription>Grant or revoke portal roles with audit logging.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-sm">
            {PORTAL_ROLES.map((role) => {
              const hasRole = detail.roles.portal.includes(role);
              return (
                <form key={role} action={toggleRole} className="flex items-center justify-between gap-space-xs rounded-xl border border-outline/12 px-space-sm py-space-2xs">
                  <div>
                    <p className="text-body-md font-medium text-on-surface">{role}</p>
                    <p className="text-label-sm text-muted-foreground">
                      {role === 'portal_admin'
                        ? 'Full admin workspace access'
                        : role === 'portal_org_admin'
                          ? 'Org-scoped administration'
                          : role === 'portal_org_rep'
                            ? 'Org member with elevated access'
                            : 'Baseline portal user'}
                    </p>
                  </div>
                  <input type="hidden" name="profile_id" value={detail.profile.id} />
                  <input type="hidden" name="role_name" value={role} />
                  <input type="hidden" name="enable" value={(!hasRole).toString()} />
                  <Button type="submit" variant={hasRole ? 'outline' : 'secondary'} size="sm">
                    {hasRole ? 'Revoke' : 'Grant'}
                  </Button>
                </form>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-space-lg lg:grid-cols-3">
        <Card className="lg:col-span-2 border-outline/20">
          <CardHeader>
            <CardTitle>Audit history</CardTitle>
            <CardDescription>Recent actions on this profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-xs">
            {detail.auditEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No events yet.</p>
            ) : (
              <ul className="space-y-space-xs">
                {detail.auditEvents.map((event) => (
                  <li key={event.id} className="flex items-center justify-between rounded-xl border border-outline/12 bg-surface-container-low px-space-sm py-space-2xs">
                    <div className="space-y-[2px]">
                      <p className="text-body-sm font-medium text-on-surface">{event.action}</p>
                      <p className="text-label-sm text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    {event.actorProfileId ? (
                      <Badge variant="outline" className="text-label-xs">
                        Actor {event.actorProfileId.slice(0, 6)}
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-space-lg">
          <Card className="border-outline/20">
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Email, Supabase user id, and last seen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-space-xs text-body-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-on-surface">{detail.email ?? 'None'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Supabase user</span>
                <span className="text-on-surface">{detail.profile.user_id ?? 'Not yet accepted'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last seen</span>
                <span className="text-on-surface">
                  {detail.profile.last_seen_at
                    ? new Date(detail.profile.last_seen_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {isInvitedOnly ? (
            <Card className="border-outline/20">
              <CardHeader>
                <CardTitle>Send invitation</CardTitle>
                <CardDescription>Invite this contact to complete their account.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={sendInvite} className="space-y-space-sm">
                  <input type="hidden" name="invite_display_name" value={detail.profile.display_name} />
                  <input type="hidden" name="invite_position_title" value={detail.profile.position_title ?? ''} />
                  <div className="space-y-space-2xs">
                    <Label htmlFor="invite_email">Email</Label>
                    <Input id="invite_email" name="invite_email" type="email" required defaultValue={detail.email ?? ''} />
                  </div>
                  <div className="space-y-space-2xs">
                    <Label htmlFor="invite_affiliation_type">Affiliation</Label>
                    <select
                      id="invite_affiliation_type"
                      name="invite_affiliation_type"
                      defaultValue={detail.profile.affiliation_type}
                      className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm"
                    >
                      <option value="community_member">Client / community member</option>
                      <option value="agency_partner">Agency partner</option>
                      <option value="government_partner">Government partner</option>
                    </select>
                  </div>
                  <div className="space-y-space-2xs">
                    <Label htmlFor="invite_organization_id">Organization</Label>
                    <select
                      id="invite_organization_id"
                      name="invite_organization_id"
                      defaultValue={detail.organization?.id ?? ''}
                      className="w-full rounded-lg border border-outline/30 bg-surface px-space-sm py-space-2xs text-body-sm"
                    >
                      <option value="">No organization</option>
                      {organizations.map((org: { id: number; name: string }) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-space-2xs">
                    <Label htmlFor="invite_message">Message (optional)</Label>
                    <Textarea id="invite_message" name="invite_message" placeholder="Add context or instructions." />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit">Send invite</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Archive user</CardTitle>
              <CardDescription>Revoke access and detach from organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={archiveUser} className="flex flex-col gap-space-sm">
                <input type="hidden" name="profile_id" value={detail.profile.id} />
                <p className="text-sm text-muted-foreground">
                  This will set the affiliation to <strong>revoked</strong>, clear organization, and remove org roles.
                </p>
                <Button type="submit" variant="destructive">
                  Archive user
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
