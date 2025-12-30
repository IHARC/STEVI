'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@shared/ui/button';
import { Checkbox } from '@shared/ui/checkbox';
import { Separator } from '@shared/ui/separator';
import { useToast } from '@shared/ui/use-toast';
import { ProfileUpdateForm } from '@workspace/admin/users/profile/profile-forms';
import { formatEnumLabel } from '@/lib/enum-values';
import { archiveUserAction, toggleGlobalRoleAction, toggleOrgRoleAction, updateProfileAction } from '../actions';

type RoleSet = { global: string[]; org: string[] };
type Option = { value: string; label: string };
type OrgRoleOption = { id: string; name: string; label: string; description?: string | null };

type Props = {
  profile: {
    id: string;
    display_name: string;
    position_title: string | null;
    affiliation_type: string;
    affiliation_status: string;
    organization_id: number | null;
    government_role_type: string | null;
  };
  roles: RoleSet;
  affiliationTypes: string[];
  affiliationStatuses: string[];
  governmentRoleTypes: string[];
  organizations: { id: number; name: string }[];
  globalRoleOptions: Option[];
  orgRoleOptions: OrgRoleOption[];
  isElevated: boolean;
  canManageOrgRoles: boolean;
  effectivePermissions: string[];
};

export function UserProfileDetailClient({
  profile,
  roles,
  affiliationTypes,
  affiliationStatuses,
  governmentRoleTypes,
  organizations,
  globalRoleOptions,
  orgRoleOptions,
  isElevated,
  canManageOrgRoles,
  effectivePermissions,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [globalRoleState, setGlobalRoleState] = useState<Set<string>>(
    () => new Set(roles.global ?? []),
  );
  const [orgRoleState, setOrgRoleState] = useState<Set<string>>(
    () => new Set(roles.org ?? []),
  );

  const canToggleGlobal = isElevated;
  const canToggleOrg = isElevated || canManageOrgRoles;
  const orgRoleAvailable = Boolean(profile.organization_id);

  const handleUpdateProfile = async (formData: FormData) => {
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (!result.success) {
        toast({ title: 'Update failed', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Profile updated' });
      router.refresh();
    });
  };

  const handleGlobalRoleToggle = (roleName: string, enable: boolean) => {
    if (!canToggleGlobal) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append('profile_id', profile.id);
      formData.append('role_name', roleName);
      formData.append('enable', String(enable));

      setGlobalRoleState((prev) => {
        const next = new Set(prev);
        if (enable) next.add(roleName);
        else next.delete(roleName);
        return next;
      });

      const result = await toggleGlobalRoleAction(formData);
      if (!result.success) {
        toast({ title: 'Role update failed', description: result.error, variant: 'destructive' });
        setGlobalRoleState((prev) => {
          const next = new Set(prev);
          if (enable) next.delete(roleName);
          else next.add(roleName);
          return next;
        });
        return;
      }

      toast({ title: enable ? 'Role granted' : 'Role removed', description: roleName });
      router.refresh();
    });
  };

  const handleOrgRoleToggle = (role: OrgRoleOption, enable: boolean) => {
    if (!canToggleOrg || !orgRoleAvailable) return;
    if (!profile.organization_id) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append('profile_id', profile.id);
      formData.append('org_role_id', role.id);
      formData.append('role_name', role.name);
      formData.append('organization_id', String(profile.organization_id));
      formData.append('enable', String(enable));

      setOrgRoleState((prev) => {
        const next = new Set(prev);
        if (enable) next.add(role.name);
        else next.delete(role.name);
        return next;
      });

      const result = await toggleOrgRoleAction(formData);
      if (!result.success) {
        toast({ title: 'Role update failed', description: result.error, variant: 'destructive' });
        setOrgRoleState((prev) => {
          const next = new Set(prev);
          if (enable) next.delete(role.name);
          else next.add(role.name);
          return next;
        });
        return;
      }

      toast({ title: enable ? 'Role granted' : 'Role removed', description: role.label });
      router.refresh();
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('profile_id', profile.id);
      const result = await archiveUserAction(formData);
      if (!result.success) {
        toast({ title: 'Archive failed', description: result.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'User archived', description: 'Access revoked and roles cleared.' });
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <ProfileUpdateForm
        profile={profile}
        affiliationTypes={affiliationTypes}
        affiliationStatuses={affiliationStatuses}
        governmentRoleTypes={governmentRoleTypes}
        organizations={organizations}
        action={handleUpdateProfile}
      />

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Permissions</h3>
            <p className="text-xs text-muted-foreground">
              {isElevated
                ? 'IHARC admins can grant global roles and org roles.'
                : canManageOrgRoles
                  ? 'Org admins can grant org-scoped roles for their organization.'
                  : 'Read-only access to roles for this profile.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from(globalRoleState).map((role) => (
              <span key={role} className="capitalize text-xs">
                {role.replaceAll('_', ' ')}
              </span>
            ))}
            {Array.from(orgRoleState).map((role) => (
              <span key={role} className="capitalize text-xs">
                {role.replaceAll('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <RoleGroup
            title="Global roles"
            options={globalRoleOptions}
            roleState={globalRoleState}
            onToggle={handleGlobalRoleToggle}
            canToggleRole={() => canToggleGlobal}
            disabled={isPending}
          />
          <OrgRoleGroup
            title="Organization roles"
            options={orgRoleOptions}
            roleState={orgRoleState}
            onToggle={handleOrgRoleToggle}
            canToggleRole={() => canToggleOrg}
            disabled={isPending}
            organizationSelected={orgRoleAvailable}
          />
        </div>

        <div className="rounded-2xl border border-border/30 bg-muted p-3">
          <h4 className="text-sm font-semibold text-foreground">Effective permissions</h4>
          {!orgRoleAvailable ? (
            <p className="text-xs text-muted-foreground">Assign an organization to view effective permissions.</p>
          ) : effectivePermissions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No permissions found for this organization.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1">
              {effectivePermissions.map((permission) => (
                <span key={permission} className="text-xs">
                  {formatEnumLabel(permission)}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <Separator />

      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleArchive} disabled={isPending}>
          Archive / revoke access
        </Button>
      </div>
    </div>
  );
}

function RoleGroup({
  title,
  options,
  roleState,
  onToggle,
  canToggleRole,
  disabled,
}: {
  title: string;
  options: Option[];
  roleState: Set<string>;
  onToggle: (roleName: string, enable: boolean) => void;
  canToggleRole: (roleName: string) => boolean;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/30 bg-muted p-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="space-y-1">
        {options.map((role) => {
          const checked = roleState.has(role.value);
          const allowed = canToggleRole(role.value);
          return (
            <label
              key={role.value}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/15 bg-background px-3 py-2 text-sm"
            >
              <span className={allowed ? 'text-foreground' : 'text-muted-foreground'}>{role.label}</span>
              <Checkbox
                checked={checked}
                onCheckedChange={(value) => onToggle(role.value, Boolean(value))}
                disabled={disabled || !allowed}
                aria-label={role.label}
              />
            </label>
          );
        })}
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground">No roles available.</p>
        ) : null}
      </div>
    </div>
  );
}

function OrgRoleGroup({
  title,
  options,
  roleState,
  onToggle,
  canToggleRole,
  disabled,
  organizationSelected,
}: {
  title: string;
  options: OrgRoleOption[];
  roleState: Set<string>;
  onToggle: (role: OrgRoleOption, enable: boolean) => void;
  canToggleRole: (role: OrgRoleOption) => boolean;
  disabled: boolean;
  organizationSelected: boolean;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/30 bg-muted p-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="space-y-1">
        {!organizationSelected ? (
          <p className="text-xs text-muted-foreground">Assign an organization to manage org roles.</p>
        ) : (
          options.map((role) => {
            const checked = roleState.has(role.name);
            const allowed = canToggleRole(role);
            return (
              <label
                key={role.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/15 bg-background px-3 py-2 text-sm"
              >
                <span className={allowed ? 'text-foreground' : 'text-muted-foreground'}>
                  {role.label}
                  {role.description ? <span className="block text-xs text-muted-foreground">{role.description}</span> : null}
                </span>
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => onToggle(role, Boolean(value))}
                  disabled={disabled || !allowed}
                  aria-label={role.label}
                />
              </label>
            );
          })
        )}
        {organizationSelected && options.length === 0 ? (
          <p className="text-xs text-muted-foreground">No org roles available.</p>
        ) : null}
      </div>
    </div>
  );
}
