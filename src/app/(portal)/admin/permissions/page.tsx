import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { loadPortalAccess } from '@/lib/portal-access';
import { ensurePortalProfile } from '@/lib/profile';
import { resolveLandingPath } from '@/lib/portal-navigation';
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
    redirect(resolveLandingPath(access));
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
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-6 px-4 py-8 md:px-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Admin · Permissions</p>
        <h1 className="text-xl text-foreground sm:text-2xl">Permissions control</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
          Manage granular permissions for roles. Changes take effect immediately and refresh user claims on next refresh.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/40 bg-card">
          <CardHeader>
            <CardTitle>Roles & permissions</CardTitle>
            <CardDescription>Toggle which permissions are granted to each role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.map((role) => (
              <div key={role.id} className="rounded-2xl border border-border/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg text-foreground">{role.display_name || role.name}</h2>
                      {role.is_system_role ? <Badge variant="outline">System</Badge> : null}
                    </div>
                    {role.description ? (
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    ) : null}
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  {Object.entries(groupedPerms).map(([domain, perms]) => (
                    <div key={domain} className="space-y-1">
                      <p className="text-xs font-medium uppercase text-muted-foreground">{domain}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {perms.map((perm) => {
                          const assigned = rolePermissions.has(`${role.id}:${perm.id}`);
                          return (
                            <form
                              key={perm.id}
                              action={handleToggle}
                              className="flex items-start justify-between gap-3 rounded-xl border border-border/20 px-3 py-1"
                            >
                              <div className="space-y-[2px]">
                                <p className="text-sm font-medium text-foreground">{perm.name}</p>
                                {perm.description ? (
                                  <p className="text-xs text-muted-foreground">{perm.description}</p>
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

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle>Create permission</CardTitle>
            <CardDescription>Add a new granular permission for assignment to roles.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g., portal.documents.read" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="What does this permission allow?" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" name="domain" placeholder="e.g., portal, marketing, inventory" />
              </div>
              <div className="space-y-1">
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
