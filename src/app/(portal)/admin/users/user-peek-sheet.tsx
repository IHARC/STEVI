'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { toggleRoleAction, updateProfileAction } from './actions';
import type { AdminUserListItem } from '@/lib/admin-users';

type UserPeekSheetProps = {
  user: AdminUserListItem;
  roleOptions: { value: string; label: string }[];
};

export function UserPeekSheet({ user, roleOptions }: UserPeekSheetProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const roles = useMemo(() => new Set([...(user.roles.portal ?? []), ...(user.roles.iharc ?? [])]), [user.roles]);

  const handleRoleToggle = (role: string, enable: boolean) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('profile_id', user.profileId);
      formData.append('role_name', role);
      formData.append('enable', String(enable));
      const result = await toggleRoleAction(formData);
      if (!result.success) {
        toast({ title: 'Role update failed', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: enable ? 'Role granted' : 'Role removed', description: role });
      }
    });
  };

  const handleApprove = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('profile_id', user.profileId);
      formData.append('affiliation_status', 'approved');
      const result = await updateProfileAction(formData);
      if (!result.success) {
        toast({ title: 'Approval failed', description: result.error, variant: 'destructive' });
      } else {
        toast({ title: 'Profile approved', description: 'Status set to approved.' });
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">Peek</Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-[520px] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="text-xl">{user.displayName}</SheetTitle>
          <p className="text-xs text-muted-foreground">{user.email ?? 'No email on file'}</p>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="capitalize">{user.affiliationType.replace('_', ' ')}</Badge>
            <Badge variant={user.affiliationStatus === 'approved' ? 'default' : user.affiliationStatus === 'pending' ? 'outline' : 'secondary'}>
              {user.affiliationStatus}
            </Badge>
            {user.organizationName ? (
              <Badge variant="outline">{user.organizationName}</Badge>
            ) : (
              <Badge variant="outline">No org</Badge>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Roles</p>
            <div className="flex flex-wrap gap-1">
              {Array.from(roles).map((role) => (
                <Badge key={role} variant={role.startsWith('portal_') ? 'outline' : 'secondary'} className="capitalize">
                  {role.replace('portal_', '').replace('iharc_', '')}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/15 bg-muted p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Approve profile</p>
                <p className="text-xs text-muted-foreground">Sets status to approved and refreshes permissions.</p>
              </div>
              <Button size="sm" onClick={handleApprove} disabled={isPending || user.affiliationStatus === 'approved'}>
                Approve
              </Button>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              {roleOptions.map((role) => (
                <RoleToggle
                  key={role.value}
                  label={role.label}
                  checked={roles.has(role.value)}
                  onChange={(checked) => handleRoleToggle(role.value, checked)}
                  disabled={isPending}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/users/profile/${user.profileId}`}>Open full profile</Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type RoleToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

function RoleToggle({ label, checked, onChange, disabled }: RoleToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border/15 bg-background px-3 py-1 text-sm text-foreground">
      <span>{label}</span>
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(Boolean(value))}
        disabled={disabled}
        aria-label={label}
      />
    </label>
  );
}
