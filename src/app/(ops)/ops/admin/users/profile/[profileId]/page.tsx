import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { fetchAdminUserDetail, fetchUserOrgPermissions, loadProfileEnums } from '@/lib/admin-users';
import { formatEnumLabel, getGlobalRoles, toOptions } from '@/lib/enum-values';
import { fetchOrgRoles } from '@/lib/org/fetchers';
import { PageHeader } from '@shared/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { UserProfileDetailClient } from '../user-profile-detail-client';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ profileId: string }>;
};

export default async function AdminUserProfilePage({ params }: PageProps) {
  const { profileId } = await params;
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect(`/login?next=/ops/admin/users/profile/${profileId}`);
  }

  if (!access.canAccessOpsAdmin) {
    redirect(resolveLandingPath(access));
  }

  const detail = await fetchAdminUserDetail(supabase, profileId);
  if (!detail) {
    redirect('/ops/admin/users/all');
  }

  const [{ affiliationTypes, affiliationStatuses, governmentRoleTypes }, organizationsResult, globalRolesRaw] = await Promise.all([
    loadProfileEnums(supabase),
    supabase.schema('core').from('organizations').select('id, name').order('name').limit(200),
    access.isGlobalAdmin ? getGlobalRoles(supabase) : Promise.resolve([]),
  ] as const);

  if (organizationsResult.error) throw organizationsResult.error;
  const organizations = (organizationsResult.data ?? []).map((o: { id: number; name: string | null }) => ({
    id: o.id,
    name: o.name ?? 'Organization',
  }));

  const globalRoles = globalRolesRaw as string[];
  const globalRoleOptions = toOptions(globalRoles);

  const orgRoles = detail.profile.organization_id
    ? await fetchOrgRoles(supabase, detail.profile.organization_id)
    : [];
  const orgRoleOptions = orgRoles.map((role) => ({
    id: role.id,
    name: role.name,
    label: role.display_name ?? formatEnumLabel(role.name),
  }));

  const isElevated = access.isGlobalAdmin;
  const effectivePermissions = await fetchUserOrgPermissions(
    supabase,
    detail.profile.user_id,
    detail.profile.organization_id,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="STEVI Admin"
        title={detail.profile.display_name || 'User profile'}
        description={detail.email ?? 'No email on file.'}
        secondaryAction={{ label: 'Back to users', href: '/ops/admin/users/all' }}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Profile details</CardTitle>
            <CardDescription>Update affiliation, organization linkage, and contact metadata.</CardDescription>
          </CardHeader>
          <CardContent>
            <UserProfileDetailClient
              profile={detail.profile}
              roles={detail.roles}
              affiliationTypes={affiliationTypes}
              affiliationStatuses={affiliationStatuses}
              governmentRoleTypes={governmentRoleTypes}
              organizations={organizations}
              globalRoleOptions={globalRoleOptions}
              orgRoleOptions={orgRoleOptions}
              isElevated={isElevated}
              canManageOrgRoles={access.canManageOrgUsers}
              effectivePermissions={effectivePermissions}
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-xl">Recent activity</CardTitle>
            <CardDescription>Latest administrative actions for this user.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {detail.auditEvents.length === 0 ? (
              <p className="text-muted-foreground">No audit activity yet.</p>
            ) : (
              <ul className="space-y-2">
                {detail.auditEvents.map((event) => (
                  <li key={event.id} className="rounded-lg border border-border/40 bg-muted px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{event.action.replaceAll('_', ' ')}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
