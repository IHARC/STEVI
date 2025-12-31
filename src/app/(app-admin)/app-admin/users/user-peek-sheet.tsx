'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { Button } from '@shared/ui/button';
import { useToast } from '@shared/ui/use-toast';
import { updateProfileAction } from './actions';
import type { AdminUserListItem } from '@/lib/admin-users';

type UserPeekSheetProps = {
  user: AdminUserListItem;
};

export function UserPeekSheet({ user }: UserPeekSheetProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const roles = useMemo(() => new Set([...(user.roles.global ?? []), ...(user.roles.org ?? [])]), [user.roles]);

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
          <SheetDescription className="text-xs">{user.email ?? 'No email on file'}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm">
          <div className="flex flex-wrap gap-1">
            <span className="capitalize">{user.affiliationType.replace('_', ' ')}</span>
            <span>
              {user.affiliationStatus}
            </span>
            {user.organizationName ? (
              <span>{user.organizationName}</span>
            ) : (
              <span>No org</span>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Roles</p>
            <div className="flex flex-wrap gap-1">
              {Array.from(roles).map((role) => (
                <span key={role} className="capitalize">
                  {role.replace('portal_', '').replace('iharc_', '')}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/15 bg-muted p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Approve profile</p>
                <p className="text-xs text-muted-foreground">Sets status to approved for portal access.</p>
              </div>
              <Button size="sm" onClick={handleApprove} disabled={isPending || user.affiliationStatus === 'approved'}>
                Approve
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href={`/app-admin/users/profile/${user.profileId}`}>Open full profile</Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
