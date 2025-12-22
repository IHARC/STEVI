import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { PageHeader } from '@shared/layout/page-header';
import { RoleTemplateManager } from '@workspace/admin/permissions/role-template-manager';
import { OrgRoleManager } from '@workspace/admin/permissions/org-role-manager';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type OrgRoleSummary = Pick<
  Database['core']['Tables']['org_roles']['Row'],
  'id' | 'name' | 'display_name' | 'description' | 'template_id'
>;

function readOrgId(params: Record<string, string | string[] | undefined> | undefined): number | null {
  if (!params) return null;
  const raw = params.org;
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export default async function AdminPermissionsPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/app-admin/permissions');
  }

  if (!access.isGlobalAdmin) {
    redirect(resolveLandingPath(access));
  }

  const [permissionsResult, templatesResult, templatePermissionsResult, organizationsResult] = await Promise.all([
    supabase.schema('core').from('permissions').select('id, name, description, domain, category').order('name'),
    supabase.schema('core').from('role_templates').select('id, name, display_name, description').order('display_name'),
    supabase.schema('core').from('role_template_permissions').select('template_id, permission_id'),
    supabase.schema('core').from('organizations').select('id, name').order('name'),
  ] as const);

  if (permissionsResult.error) throw permissionsResult.error;
  if (templatesResult.error) throw templatesResult.error;
  if (templatePermissionsResult.error) throw templatePermissionsResult.error;
  if (organizationsResult.error) throw organizationsResult.error;

  const permissions = permissionsResult.data ?? [];
  const templates = templatesResult.data ?? [];
  const templatePermissions = templatePermissionsResult.data ?? [];
  const organizations = organizationsResult.data ?? [];

  const requestedOrgId = readOrgId(resolvedParams);
  const selectedOrgId = requestedOrgId ?? (organizations[0]?.id ?? null);

  const orgRolesResult = selectedOrgId
    ? await supabase
        .schema('core')
        .from('org_roles')
        .select('id, name, display_name, description, template_id')
        .eq('organization_id', selectedOrgId)
        .order('display_name')
    : { data: [], error: null };

  if (orgRolesResult.error) throw orgRolesResult.error;

  const orgRoles = (orgRolesResult.data ?? []) as OrgRoleSummary[];
  const orgRoleIds = orgRoles.map((role) => role.id);

  const orgRolePermissionsResult = orgRoleIds.length
    ? await supabase
        .schema('core')
        .from('org_role_permissions')
        .select('org_role_id, permission_id')
        .in('org_role_id', orgRoleIds)
    : { data: [], error: null };

  if (orgRolePermissionsResult.error) throw orgRolePermissionsResult.error;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="STEVI Admin"
        title="Roles & permissions"
        description="Design permission sets, map them to org roles, and keep access consistent."
        breadcrumbs={[{ label: 'STEVI Admin', href: '/app-admin' }, { label: 'Roles & permissions' }]}
      />

      <RoleTemplateManager
        templates={templates}
        permissions={permissions}
        templatePermissions={templatePermissions}
      />

      <OrgRoleManager
        organizations={organizations}
        selectedOrgId={selectedOrgId}
        roles={orgRoles}
        templates={templates}
        permissions={permissions}
        orgRolePermissions={(orgRolePermissionsResult.data ?? []) as Array<{ org_role_id: string; permission_id: string }>}
      />
    </div>
  );
}
