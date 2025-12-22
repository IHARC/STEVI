'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@shared/ui/use-toast';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/card';
import { Checkbox } from '@shared/ui/checkbox';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { Textarea } from '@shared/ui/textarea';
import { formatEnumLabel } from '@/lib/enum-values';
import { createRoleTemplateAction, toggleRoleTemplatePermissionAction } from '@/app/(app-admin)/app-admin/permissions/actions';

type RoleTemplate = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
};

type Permission = {
  id: string;
  name: string;
  description: string | null;
  domain: string | null;
  category: string | null;
};

type TemplatePermission = {
  template_id: string;
  permission_id: string;
};

type Props = {
  templates: RoleTemplate[];
  permissions: Permission[];
  templatePermissions: TemplatePermission[];
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

export function RoleTemplateManager({ templates, permissions, templatePermissions }: Props) {
  const { toast } = useToast();
  const router = useRouter();
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

  const [templateState, setTemplateState] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    templates.forEach((template) => {
      const ids = templatePermissions
        .filter((entry) => entry.template_id === template.id)
        .map((entry) => entry.permission_id);
      initial[template.id] = new Set(ids);
    });
    return initial;
  });

  const handleCreateTemplate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await createRoleTemplateAction(formData);
      if (!result.success) {
        toast({ title: 'Template creation failed', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Template created' });
      form.reset();
      router.refresh();
    });
  };

  const handleTogglePermission = (templateId: string, permission: Permission, enable: boolean) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('template_id', templateId);
      formData.append('permission_id', permission.id);
      formData.append('enable', String(enable));

      setTemplateState((prev) => {
        const next = { ...prev };
        const set = new Set(next[templateId] ?? []);
        if (enable) set.add(permission.id);
        else set.delete(permission.id);
        next[templateId] = set;
        return next;
      });

      const result = await toggleRoleTemplatePermissionAction(formData);
      if (!result.success) {
        toast({ title: 'Permission update failed', description: result.error, variant: 'destructive' });
        setTemplateState((prev) => {
          const next = { ...prev };
          const set = new Set(next[templateId] ?? []);
          if (enable) set.delete(permission.id);
          else set.add(permission.id);
          next[templateId] = set;
          return next;
        });
        return;
      }

      toast({ title: enable ? 'Permission granted' : 'Permission removed', description: permission.name });
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Role templates</h2>
          <p className="text-xs text-muted-foreground">Define reusable permission bundles for organizations.</p>
        </div>
        <Badge variant="secondary">{templates.length} templates</Badge>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">Create template</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreateTemplate}>
            <div className="space-y-1">
              <Label htmlFor="template-name">Name</Label>
              <Input id="template-name" name="name" placeholder="org_marketing" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="template-display">Display name</Label>
              <Input id="template-display" name="display_name" placeholder="Org Marketing" required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="template-desc">Description</Label>
              <Textarea id="template-desc" name="description" placeholder="Optional description" rows={2} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={isPending}>
                Create template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="template-permission-filter" className="text-xs text-muted-foreground">
          Filter permissions
        </Label>
        <Input
          id="template-permission-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search permissions..."
          className="h-8 w-full max-w-[240px]"
        />
      </div>

      <div className="grid gap-4">
        {templates.map((template) => {
          const assigned = templateState[template.id] ?? new Set();
          return (
            <Card key={template.id} className="border-border/60">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{template.display_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{template.description ?? template.name}</p>
                  </div>
                  <Badge variant="outline">{template.name}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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
                              onCheckedChange={(value) => handleTogglePermission(template.id, permission, Boolean(value))}
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
        {templates.length === 0 ? (
          <Card className="border-border/60 border-dashed">
            <CardContent className="py-6 text-sm text-muted-foreground">No templates yet.</CardContent>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
