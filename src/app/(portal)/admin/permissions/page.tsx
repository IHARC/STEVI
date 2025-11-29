import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { ensurePortalProfile } from '@/lib/profile';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { togglePermissionAction, createPermissionAction } from './actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';

type Role = {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  is_system_role: boolean | null;
};

type Permission = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  domain: string | null;
};

type RolePermission = {
  role_id: string;
  permission_id: string;
};

function groupPermissions(permissions: Permission[]) {
  const grouped: Record<string, Permission[]> = {};
  permissions.forEach((perm) => {
    const key = perm.domain || 'general';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(perm);
  });
  Object.values(grouped).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name)));
  return grouped;
}

export default async function PermissionsPage() {
  const supabase = await createSupabaseRSCClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    redirect('/login?next=/admin/permissions');
  }

  if (!access.isProfileApproved || !(access.portalRoles.includes('portal_admin') || access.iharcRoles.includes('iharc_admin')) ) {
    redirect(resolveDefaultWorkspacePath(access));
  }

  await ensurePortalProfile(supabase, access.userId);

  const [rolesRes, permsRes, rolePermRes] = await Promise.all([
    supabase.schema('core').from('roles').select('id, name, display_name, description, is_system_role').order('name'),
    supabase.schema('core').from('permissions').select('id, name, description, category, domain').order('domain').order('name'),
    supabase.schema('core').from('role_permissions').select('role_id, permission_id'),
  ]);

  if (rolesRes.error) throw rolesRes.error;
  if (permsRes.error) throw permsRes.error;
  if (rolePermRes.error) throw rolePermRes.error;

  const roles = (rolesRes.data ?? []) as Role[];
  const permissions = (permsRes.data ?? []) as Permission[];
  const rolePermissions = new Set(
    (rolePermRes.data ?? []).map((rp: RolePermission) => `${rp.role_id}:${rp.permission_id}`),
  );

  const groupedPerms = groupPermissions(permissions);

  const handleToggle = async (formData: FormData) => {
    'use server';
    const result = await togglePermissionAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleCreate = async (formData: FormData) => {
    'use server';
    const result = await createPermissionAction(formData);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">Admin · Permissions</p>
        <h1 className="text-headline-md text-on-surface sm:text-headline-lg">Permissions control</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          Manage granular permissions for roles. Changes take effect immediately and refresh user claims on next refresh.
        </p>
      </header>

      <div className="grid gap-space-lg lg:grid-cols-3">
        <Card className="lg:col-span-2 border-outline/20 bg-surface-container">
          <CardHeader>
            <CardTitle>Roles & permissions</CardTitle>
            <CardDescription>Toggle which permissions are granted to each role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-space-md">
            {roles.map((role) => (
              <div key={role.id} className="rounded-2xl border border-outline/12 p-space-md space-y-space-sm">
                <div className="flex items-start justify-between gap-space-sm">
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <h2 className="text-title-md text-on-surface">{role.display_name || role.name}</h2>
                      {role.is_system_role ? <Badge variant="outline">System</Badge> : null}
                    </div>
                    {role.description ? (
                      <p className="text-body-sm text-muted-foreground">{role.description}</p>
                    ) : null}
                  </div>
                </div>
                <Separator />
                <div className="space-y-space-sm">
                  {Object.entries(groupedPerms).map(([domain, perms]) => (
                    <div key={domain} className="space-y-space-2xs">
                      <p className="text-label-sm font-medium uppercase text-muted-foreground">{domain}</p>
                      <div className="grid gap-space-xs md:grid-cols-2">
                        {perms.map((perm) => {
                          const assigned = rolePermissions.has(`${role.id}:${perm.id}`);
                          return (
                            <form
                              key={perm.id}
                              action={handleToggle}
                              className="flex items-start justify-between gap-space-sm rounded-xl border border-outline/10 px-space-sm py-space-2xs"
                            >
                              <div className="space-y-[2px]">
                                <p className="text-body-sm font-medium text-on-surface">{perm.name}</p>
                                {perm.description ? (
                                  <p className="text-label-sm text-muted-foreground">{perm.description}</p>
                                ) : null}
                              </div>
                              <input type="hidden" name="role_id" value={role.id} />
                              <input type="hidden" name="permission_id" value={perm.id} />
                              <input type="hidden" name="enable" value={(!assigned).toString()} />
                              <Button type="submit" variant={assigned ? 'outline' : 'secondary'} size="sm">
                                {assigned ? 'Revoke' : 'Grant'}
                              </Button>
                            </form>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-outline/20">
          <CardHeader>
            <CardTitle>Create permission</CardTitle>
            <CardDescription>Add a new granular permission for assignment to roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleCreate} className="space-y-space-sm">
              <div className="space-y-space-2xs">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g., portal.documents.read" />
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="What does this permission allow?" />
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" name="domain" placeholder="e.g., portal, marketing, inventory" />
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor="category">Category</Label>
                <Input id="category" name="category" placeholder="e.g., documents" />
              </div>
              <Button type="submit">Create permission</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
