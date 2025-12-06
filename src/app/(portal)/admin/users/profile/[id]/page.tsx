import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { fetchAdminUserDetail, loadProfileEnums } from '@/lib/admin-users';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { updateProfileAction, toggleRoleAction, archiveUserAction, sendInviteAction } from '../../actions';
import { getPortalRoles, formatEnumLabel } from '@/lib/enum-values';
import { ProfileUpdateForm, InviteUserForm } from '@/components/admin/users/profile/profile-forms';

export const dynamic = 'force-dynamic';

type RouteParams = { id: string };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id: profileId } = await params;
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=/admin/users/profile/${profileId}`);
  }
  if (!access.canAccessAdminWorkspace) {
    redirect(resolveLandingPath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const detail = await fetchAdminUserDetail(supabase, profileId);

  if (!detail) {
    redirect('/admin/users/all');
  }

  const profileEnums = await loadProfileEnums(supabase);
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

  const portalRoles = await getPortalRoles(supabase);

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
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">Admin · User</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl text-foreground">{detail.profile.display_name}</h1>
            <Badge variant={detail.profile.affiliation_status === 'approved' ? 'default' : detail.profile.affiliation_status === 'pending' ? 'outline' : 'secondary'}>
              {detail.profile.affiliation_status}
            </Badge>
            {detail.organization ? (
              <Badge variant="outline">{detail.organization.name}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Manage profile details, portal roles, organization linkage, and review recent audit history.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/users/all">Back to list</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/40 bg-card">
          <CardHeader>
            <CardTitle>Profile & affiliation</CardTitle>
            <CardDescription>Update visible details and organizational context.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileUpdateForm
              profile={{
                id: detail.profile.id,
                display_name: detail.profile.display_name,
                position_title: detail.profile.position_title,
                affiliation_type: detail.profile.affiliation_type,
                affiliation_status: detail.profile.affiliation_status,
                organization_id: detail.organization?.id ?? null,
                government_role_type: detail.profile.government_role_type,
              }}
              affiliationTypes={profileEnums.affiliationTypes}
              affiliationStatuses={profileEnums.affiliationStatuses}
              governmentRoleTypes={profileEnums.governmentRoleTypes}
              organizations={organizations}
              action={updateProfile}
            />
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card">
          <CardHeader>
            <CardTitle>Portal roles</CardTitle>
            <CardDescription>Grant or revoke portal roles with audit logging.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {portalRoles.map((role) => {
              const hasRole = detail.roles.portal.includes(role);
              const label = formatEnumLabel(role.replace(/^portal_/, ''));
              return (
                <form key={role} action={toggleRole} className="flex items-center justify-between gap-2 rounded-xl border border-border/30 px-3 py-1">
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">Portal role: {role}</p>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader>
            <CardTitle>Audit history</CardTitle>
            <CardDescription>Recent actions on this profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.auditEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">No events yet.</p>
            ) : (
              <ul className="space-y-2">
                {detail.auditEvents.map((event) => (
                  <li key={event.id} className="flex items-center justify-between rounded-xl border border-border/30 bg-muted px-3 py-1">
                    <div className="space-y-[2px]">
                      <p className="text-sm font-medium text-foreground">{event.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    {event.actorProfileId ? (
                      <Badge variant="outline" className="text-[0.7rem]">
                        Actor {event.actorProfileId.slice(0, 6)}
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Email, Supabase user id, and last seen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="text-foreground">{detail.email ?? 'None'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Supabase user</span>
                <span className="text-foreground">{detail.profile.user_id ?? 'Not yet accepted'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last seen</span>
                <span className="text-foreground">
                  {detail.profile.last_seen_at
                    ? new Date(detail.profile.last_seen_at).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {isInvitedOnly ? (
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>Send invitation</CardTitle>
                <CardDescription>Invite this contact to complete their account.</CardDescription>
              </CardHeader>
              <CardContent>
                <InviteUserForm
                  profileId={detail.profile.id}
                  displayName={detail.profile.display_name}
                  positionTitle={detail.profile.position_title}
                  email={detail.email}
                  affiliationTypes={profileEnums.affiliationTypes}
                  organizations={organizations}
                  action={sendInvite}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-destructive">Archive user</CardTitle>
              <CardDescription>Revoke access and detach from organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={archiveUser} className="flex flex-col gap-3">
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
