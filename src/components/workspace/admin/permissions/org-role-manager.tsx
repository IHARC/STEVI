'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@shared/ui/use-toast';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Checkbox } from '@shared/ui/checkbox';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import { formatEnumLabel } from '@/lib/enum-values';
import {
  applyTemplateToOrgRoleAction,
  createOrgRoleAction,
  toggleOrgRolePermissionAction,
} from '@/app/(app-admin)/app-admin/permissions/actions';

type Organization = { id: number; name: string | null };
type RoleTemplate = { id: string; name: string; display_name: string };
type OrgRole = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  template_id: string | null;
};
type Permission = {
  id: string;
  name: string;
  description: string | null;
  domain: string | null;
  category: string | null;
};
type OrgRolePermission = { org_role_id: string; permission_id: string };

type Props = {
  organizations: Organization[];
  selectedOrgId: number | null;
  roles: OrgRole[];
  templates: RoleTemplate[];
  permissions: Permission[];
  orgRolePermissions: OrgRolePermission[];
};

type PermissionGroup = {
  label: string;
  permissions: Permission[];
};

function buildPermissionGroups(permissions: Permission[]): PermissionGroup[] {
  const grouped = new Map<string, Permission[]>();
  permissions.forEach((permission) => {
    const label = permission.category || permission.domain || 'General';
    const group = grouped.get(label) ?? [];
    group.push(permission);
    grouped.set(label, group);
  });

  return Array.from(grouped.entries())
    .map(([label, entries]) => ({
      label: formatEnumLabel(label),
      permissions: entries.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function OrgRoleManager({
  organizations,
  selectedOrgId,
  roles,
  templates,
  permissions,
  orgRolePermissions,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('');
  const normalizedFilter = filter.trim().toLowerCase();
  const filteredPermissions = useMemo(() => {
    if (!normalizedFilter) return permissions;
    return permissions.filter((permission) => {
      const name = permission.name.toLowerCase();
      const description = permission.description?.toLowerCase() ?? '';
      const domain = permission.domain?.toLowerCase() ?? '';
      const category = permission.category?.toLowerCase() ?? '';
      return (
        name.includes(normalizedFilter) ||
        description.includes(normalizedFilter) ||
        domain.includes(normalizedFilter) ||
        category.includes(normalizedFilter)
      );
    });
  }, [permissions, normalizedFilter]);
  const permissionGroups = useMemo(() => buildPermissionGroups(filteredPermissions), [filteredPermissions]);

  const [rolePermissionState, setRolePermissionState] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    roles.forEach((role) => {
      const ids = orgRolePermissions
        .filter((entry) => entry.org_role_id === role.id)
        .map((entry) => entry.permission_id);
      initial[role.id] = new Set(ids);
    });
    return initial;
  });

  const [templateSelection, setTemplateSelection] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    roles.forEach((role) => {
      if (role.template_id) initial[role.id] = role.template_id;
    });
    return initial;
  });
  const [newRoleTemplate, setNewRoleTemplate] = useState('');

  const selectedOrg = organizations.find((org) => org.id === selectedOrgId) ?? null;

  const handleOrgChange = (value: string) => {
    const next = new URLSearchParams(searchParams?.toString());
    if (value) next.set('org', value);
    else next.delete('org');
    router.push(`/app-admin/permissions?${next.toString()}`);
  };

  const handleCreateOrgRole = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (selectedOrgId) {
      formData.set('organization_id', String(selectedOrgId));
    }
    startTransition(async () => {
      const result = await createOrgRoleAction(formData);
      if (!result.success) {
        toast({ title: 'Role creation failed', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Org role created' });
      form.reset();
      setNewRoleTemplate('');
      router.refresh();
    });
  };

  const handleTogglePermission = (orgRoleId: string, permission: Permission, enable: boolean) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('org_role_id', orgRoleId);
      formData.append('permission_id', permission.id);
      formData.append('enable', String(enable));

      setRolePermissionState((prev) => {
        const next = { ...prev };
        const set = new Set(next[orgRoleId] ?? []);
        if (enable) set.add(permission.id);
        else set.delete(permission.id);
        next[orgRoleId] = set;
        return next;
      });

      const result = await toggleOrgRolePermissionAction(formData);
      if (!result.success) {
        toast({ title: 'Permission update failed', description: result.error, variant: 'destructive' });
        setRolePermissionState((prev) => {
          const next = { ...prev };
          const set = new Set(next[orgRoleId] ?? []);
          if (enable) set.delete(permission.id);
          else set.add(permission.id);
          next[orgRoleId] = set;
          return next;
        });
        return;
      }

      toast({ title: enable ? 'Permission granted' : 'Permission removed', description: permission.name });
    });
  };

  const handleApplyTemplate = (orgRoleId: string) => {
    const templateId = templateSelection[orgRoleId];
    if (!templateId) return;
    if (!window.confirm('Apply this template? Existing custom permissions will be replaced.')) {
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append('org_role_id', orgRoleId);
      formData.append('template_id', templateId);
      const result = await applyTemplateToOrgRoleAction(formData);
      if (!result.success) {
        toast({ title: 'Template apply failed', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Template applied' });
      router.refresh();
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Organization roles</h2>
          <p className="text-xs text-muted-foreground">Assign templates and customize org-level permissions.</p>
        </div>
        <div className="min-w-[220px]">
          <Select value={selectedOrgId ? String(selectedOrgId) : ''} onValueChange={handleOrgChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={String(org.id)}>
                  {org.name ?? `Org ${org.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Create org role</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreateOrgRole}>
            <input type="hidden" name="template_id" value={newRoleTemplate} />
            <div className="space-y-1">
              <Label htmlFor="org-role-name">Role name</Label>
              <Input id="org-role-name" name="name" placeholder="org_marketing" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="org-role-display">Display name</Label>
              <Input id="org-role-display" name="display_name" placeholder="Org Marketing" required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="org-role-template">Template</Label>
              <Select value={newRoleTemplate} onValueChange={setNewRoleTemplate}>
                <SelectTrigger id="org-role-template">
                  <SelectValue placeholder="Optional template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="org-role-desc">Description</Label>
              <Textarea id="org-role-desc" name="description" placeholder="Optional description" rows={2} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isPending || !selectedOrgId}>
                Create org role
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {selectedOrg ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="org-role-permission-filter" className="text-xs text-muted-foreground">
              Filter permissions
            </Label>
            <Input
              id="org-role-permission-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search permissions..."
              className="h-8 w-full max-w-[240px]"
            />
          </div>
          {roles.map((role) => {
            const assigned = rolePermissionState[role.id] ?? new Set();
            return (
              <Card key={role.id} className="border-border/60">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{role.display_name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{role.description ?? role.name}</p>
                    </div>
                    <Badge variant="outline">{role.name}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-1">
                      <Label htmlFor={`template-${role.id}`}>Template</Label>
                      <Select
                        value={templateSelection[role.id] ?? ''}
                        onValueChange={(value) =>
                          setTemplateSelection((prev) => ({ ...prev, [role.id]: value }))
                        }
                      >
                        <SelectTrigger id={`template-${role.id}`}>
                          <SelectValue placeholder="No template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No template</SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleApplyTemplate(role.id)}
                      disabled={isPending || !templateSelection[role.id]}
                    >
                      Apply template
                    </Button>
                  </div>

                  {permissionGroups.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{group.label}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {group.permissions.map((permission) => {
                          const checked = assigned.has(permission.id);
                          return (
                            <label
                              key={permission.id}
                              className="flex items-start justify-between gap-3 rounded-xl border border-border/15 bg-muted px-3 py-2 text-sm"
                            >
                              <span className="space-y-1">
                                <span className="block font-medium text-foreground">{permission.name}</span>
                                {permission.description ? (
                                  <span className="block text-xs text-muted-foreground">{permission.description}</span>
                                ) : null}
                              </span>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => handleTogglePermission(role.id, permission, Boolean(value))}
                                disabled={isPending}
                                aria-label={permission.name}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {permissionGroups.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No permissions match this filter.</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
          {roles.length === 0 ? (
            <Card className="border-border/60 border-dashed">
              <CardContent className="py-6 text-sm text-muted-foreground">No org roles for this organization yet.</CardContent>
            </Card>
          ) : null}
        </div>
      ) : (
        <Card className="border-border/60 border-dashed">
          <CardContent className="py-6 text-sm text-muted-foreground">Select an organization to manage roles.</CardContent>
        </Card>
      )}
    </section>
  );
}
