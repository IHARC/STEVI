'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Checkbox } from '@shared/ui/checkbox';
import { Separator } from '@shared/ui/separator';
import { useToast } from '@shared/ui/use-toast';
import { ProfileUpdateForm } from '@workspace/admin/users/profile/profile-forms';
import { archiveUserAction, toggleRoleAction, updateProfileAction } from '../actions';

type RoleSet = { portal: string[]; iharc: string[] };
type Option = { value: string; label: string };

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
  roleOptions: Option[];
  isElevated: boolean;
};

const ORG_LEVEL_ROLES = new Set(['portal_org_admin', 'portal_org_rep', 'portal_user']);

export function UserProfileDetailClient({
  profile,
  roles,
  affiliationTypes,
  affiliationStatuses,
  governmentRoleTypes,
  organizations,
  roleOptions,
  isElevated,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [roleState, setRoleState] = useState<Set<string>>(
    () => new Set([...(roles.portal ?? []), ...(roles.iharc ?? [])]),
  );

  const portalRoleOptions = useMemo(() => roleOptions.filter((r) => r.value.startsWith('portal_')), [roleOptions]);
  const iharcRoleOptions = useMemo(() => roleOptions.filter((r) => r.value.startsWith('iharc_')), [roleOptions]);

  const canToggleRole = (roleName: string) => isElevated || ORG_LEVEL_ROLES.has(roleName);

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

  const handleRoleToggle = (roleName: string, enable: boolean) => {
    if (!canToggleRole(roleName)) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append('profile_id', profile.id);
      formData.append('role_name', roleName);
      formData.append('enable', String(enable));

      setRoleState((prev) => {
        const next = new Set(prev);
        if (enable) next.add(roleName);
        else next.delete(roleName);
        return next;
      });

      const result = await toggleRoleAction(formData);
      if (!result.success) {
        toast({ title: 'Role update failed', description: result.error, variant: 'destructive' });
        setRoleState((prev) => {
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
                ? 'IHARC admins can grant any role.'
                : 'Org admins can grant org-scoped roles for their tenant.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {Array.from(roleState).map((role) => (
              <Badge key={role} variant={role.startsWith('portal_') ? 'outline' : 'secondary'} className="capitalize text-xs">
                {role.replace('portal_', '').replace('iharc_', '').replaceAll('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <RoleGroup
            title="Portal roles"
            options={portalRoleOptions}
            roleState={roleState}
            onToggle={handleRoleToggle}
            canToggleRole={canToggleRole}
            disabled={isPending}
          />
          <RoleGroup
            title="IHARC roles"
            options={iharcRoleOptions}
            roleState={roleState}
            onToggle={handleRoleToggle}
            canToggleRole={canToggleRole}
            disabled={isPending}
          />
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
