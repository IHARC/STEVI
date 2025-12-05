'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import type { OrgMemberRecord } from '@/lib/org/fetchers';
import { removeMemberAction, toggleMemberRoleAction } from './actions';

type OrgMembersTableProps = {
  members: OrgMemberRecord[];
  currentProfileId: string;
};

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatDate(value: string | null) {
  if (!value) return '—';
  try {
    return dateFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

function seedSingleRoleState(member?: OrgMemberRecord) {
  if (!member) return { admin: false, rep: false };
  const isOrgAdmin = member.portal_roles.includes('portal_org_admin') || member.portal_roles.includes('portal_admin');
  const isOrgRep = member.portal_roles.includes('portal_org_rep');
  return { admin: isOrgAdmin, rep: isOrgRep };
}

function seedRoles(members: OrgMemberRecord[]) {
  return members.reduce<Record<string, { admin: boolean; rep: boolean }>>((acc, member) => {
    acc[member.id] = seedSingleRoleState(member);
    return acc;
  }, {});
}

export function OrgMembersTable({ members, currentProfileId }: OrgMembersTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [roleState, setRoleState] = useState<Record<string, { admin: boolean; rep: boolean }>>(() =>
    seedRoles(members),
  );

  useEffect(() => {
    setRoleState(seedRoles(members));
  }, [members]);

  const handleToggle = (memberId: string, roleName: 'portal_org_admin' | 'portal_org_rep', enable: boolean) => {
    const key = `${memberId}-${roleName}`;
    setPendingKey(key);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('profile_id', memberId);
      formData.append('role_name', roleName);
      formData.append('enable', enable.toString());

      setRoleState((prev) => {
        const existing = prev[memberId] ?? seedSingleRoleState(members.find((m) => m.id === memberId));
        return {
          ...prev,
          [memberId]: {
            ...existing,
            [roleName === 'portal_org_admin' ? 'admin' : 'rep']: enable,
          },
        };
      });

      const result = await toggleMemberRoleAction(formData);
      if (!result.success) {
        toast({ title: 'Role update failed', description: result.error, variant: 'destructive' });
        setRoleState((prev) => {
          const existing = prev[memberId] ?? seedSingleRoleState(members.find((m) => m.id === memberId));
          return {
            ...prev,
            [memberId]: {
              ...existing,
              [roleName === 'portal_org_admin' ? 'admin' : 'rep']: !enable,
            },
          };
        });
      } else {
        toast({
          title: enable ? 'Role granted' : 'Role removed',
          description: roleName === 'portal_org_admin' ? 'Admin access updated.' : 'Representative access updated.',
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
          const baseAdmin =
            member.portal_roles.includes('portal_org_admin') || member.portal_roles.includes('portal_admin');
          const baseRep = member.portal_roles.includes('portal_org_rep');

          const state = roleState[member.id] ?? { admin: baseAdmin, rep: baseRep };

          const adminKey = `${member.id}-portal_org_admin`;
          const repKey = `${member.id}-portal_org_rep`;
          const removeKey = `${member.id}-remove`;

          const adminDisabled = isSelf;
          const repDisabled = isSelf && state.admin;

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
                  <Badge variant={state.admin ? 'default' : state.rep ? 'secondary' : 'outline'} className="capitalize">
                    {state.admin ? 'org admin' : state.rep ? 'org rep' : 'member'}
                  </Badge>
                  <Badge variant="outline" className="capitalize text-xs">
                    {member.affiliation_status}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>{formatDate(member.last_seen_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1 text-left">
                  <RoleToggle
                    id={`admin-${member.id}`}
                    label="Org admin"
                    description="Manage members, invites, and settings."
                    checked={state.admin}
                    disabled={adminDisabled || (isPending && pendingKey === adminKey)}
                    onChange={(checked) => handleToggle(member.id, 'portal_org_admin', checked)}
                  />
                  <RoleToggle
                    id={`rep-${member.id}`}
                    label="Org representative"
                    description="Invite members and coordinate with IHARC."
                    checked={state.rep}
                    disabled={repDisabled || (isPending && pendingKey === repKey)}
                    onChange={(checked) => handleToggle(member.id, 'portal_org_rep', checked)}
                  />
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
