'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@shared/ui/button';
import { Switch } from '@shared/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/ui/table';
import { useToast } from '@shared/ui/use-toast';
import type { OrgMemberRecord } from '@/lib/org/fetchers';
import { removeMemberAction, toggleMemberRoleAction } from './actions';

type OrgMembersTableProps = {
  members: OrgMemberRecord[];
  currentProfileId: string;
  organizationId: number;
  roles: Array<{ id: string; name: string; displayName: string | null }>;
};

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const ROLE_DESCRIPTIONS: Record<string, string> = {
  org_admin: 'Full org admin access.',
  org_rep: 'Invite members and coordinate with IHARC.',
  org_member: 'Standard org member access.',
  org_marketing: 'Manage website and marketing content.',
  iharc_staff: 'IHARC staff access.',
  iharc_supervisor: 'IHARC supervisor access.',
  iharc_volunteer: 'IHARC volunteer access.',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function seedRoles(members: OrgMemberRecord[]) {
  return members.reduce<Record<string, Set<string>>>((acc, member) => {
    const roles = new Set(member.org_roles.map((role) => role.id));
    acc[member.id] = roles;
    return acc;
  }, {});
}

export function OrgMembersTable({ members, currentProfileId, organizationId, roles }: OrgMembersTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [roleState, setRoleState] = useState<Record<string, Set<string>>>(() => seedRoles(members));

  useEffect(() => {
    setRoleState(seedRoles(members));
  }, [members]);

  const handleToggle = (memberId: string, orgRoleId: string, enable: boolean) => {
    const key = `${memberId}-${orgRoleId}`;
    setPendingKey(key);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('profile_id', memberId);
      formData.append('org_role_id', orgRoleId);
      formData.append('enable', enable.toString());
      formData.append('organization_id', String(organizationId));

      setRoleState((prev) => {
        const next = new Set(prev[memberId] ?? []);
        if (enable) next.add(orgRoleId);
        else next.delete(orgRoleId);
        return { ...prev, [memberId]: next };
      });

      const result = await toggleMemberRoleAction(formData);
      if (!result.success) {
        toast({ title: 'Role update failed', description: result.error, variant: 'destructive' });
        setRoleState((prev) => {
          const next = new Set(prev[memberId] ?? []);
          if (enable) next.delete(orgRoleId);
          else next.add(orgRoleId);
          return { ...prev, [memberId]: next };
        });
      } else {
        toast({
          title: enable ? 'Role granted' : 'Role removed',
          description: enable ? 'Access updated.' : 'Access removed.',
        });
      }

      setPendingKey(null);
      router.refresh();
    });
  };

  const handleRemove = (memberId: string) => {
    const key = `${memberId}-remove`;
    setPendingKey(key);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('profile_id', memberId);
      formData.append('organization_id', String(organizationId));

      const result = await removeMemberAction(formData);
      if (!result.success) {
        toast({ title: 'Remove failed', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Member removed', description: 'Access revoked and audit logged.' });
      }

      setPendingKey(null);
      router.refresh();
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Affiliation</TableHead>
          <TableHead>Last seen</TableHead>
          <TableHead className="text-right">Access</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const isSelf = member.id === currentProfileId;
          const removeKey = `${member.id}-remove`;
          const assignedRoles = roleState[member.id] ?? new Set(member.org_roles.map((role) => role.id));

          const adminDisabled = isSelf;

          return (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{member.display_name}</span>
                  {member.position_title ? (
                    <span className="text-xs text-muted-foreground">{member.position_title}</span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  {assignedRoles.size === 0 ? (
                    <span className="capitalize">member</span>
                  ) : null}
                  {member.org_roles.map((role) => (
                    <span key={role.id} className="capitalize">
                      {(role.displayName ?? role.name).replaceAll('_', ' ')}
                    </span>
                  ))}
                  <span className="capitalize text-xs">
                    {member.affiliation_status}
                  </span>
                </div>
              </TableCell>
              <TableCell>{formatDate(member.last_seen_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1 text-left">
                  {roles.map((role) => {
                    const roleKey = `${member.id}-${role.id}`;
                    const roleLabel = role.displayName ?? role.name;
                    const description = ROLE_DESCRIPTIONS[role.name] ?? 'Grant or remove access.';
                    return (
                      <RoleToggle
                        key={role.id}
                        id={`${member.id}-${role.id}`}
                        label={roleLabel}
                        description={description}
                        checked={assignedRoles.has(role.id)}
                        disabled={adminDisabled || (isPending && pendingKey === roleKey)}
                        onChange={(checked) => handleToggle(member.id, role.id, checked)}
                      />
                    );
                  })}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSelf || (isPending && pendingKey === removeKey)}
                    onClick={() => handleRemove(member.id)}
                  >
                    {isPending && pendingKey === removeKey ? 'Removing…' : 'Remove'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

type RoleToggleProps = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

function RoleToggle({ id, label, description, checked, disabled, onChange }: RoleToggleProps) {
  return (
    <label htmlFor={id} className="flex max-w-[320px] items-start gap-3 text-left">
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}
