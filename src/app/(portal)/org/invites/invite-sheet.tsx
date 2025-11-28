'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import type { RateLimitResult } from '@/lib/rate-limit';
import { createOrgInviteAction, type OrgInviteFormState } from './actions';
import { ORG_INVITE_RATE_LIMIT, formatInviteCooldown } from './constants';

type InviteSheetProps = {
  rateLimit: RateLimitResult;
};

const initialState: OrgInviteFormState = { status: 'idle' };

export function InviteSheet({ rateLimit }: InviteSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(createOrgInviteAction, initialState);

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Invitation sent', description: 'Recipients receive a secure link tied to your organization.' });
      formRef.current?.reset();
      router.refresh();
    } else if (state.status === 'error' && state.message) {
      toast({ title: 'Invite not sent', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router]);

  const limitMessage = useMemo(() => {
    if (rateLimit.allowed) {
      const minutes = Math.round(ORG_INVITE_RATE_LIMIT.cooldownMs / 60_000);
      return `Up to ${ORG_INVITE_RATE_LIMIT.limit} invites every ${minutes} minutes.`;
    }
    return formatInviteCooldown(rateLimit.retryInMs);
  }, [rateLimit]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">Invite member</Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-[480px] overflow-y-auto sm:w-[420px]">
        <SheetHeader className="text-left">
          <SheetTitle className="text-title-lg">Send an invitation</SheetTitle>
          <SheetDescription>
            Invitations are scoped to your organization by RLS. We include your name and optional message.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-space-md space-y-space-md">
          <div className="flex items-start justify-between gap-space-sm rounded-lg border border-outline/20 bg-surface-container-low p-space-sm">
            <Badge variant={rateLimit.allowed ? 'secondary' : 'destructive'} className="capitalize">
              {rateLimit.allowed ? 'Limit clear' : 'Rate limited'}
            </Badge>
            <p className="text-label-sm text-right text-muted-foreground">{limitMessage}</p>
          </div>

          <form ref={formRef} action={formAction} className="grid gap-space-md">
            <div className="space-y-space-2xs">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="person@example.org"
                aria-required
              />
            </div>

            <div className="grid gap-space-sm sm:grid-cols-2">
              <div className="space-y-space-2xs">
                <Label htmlFor="display_name">Display name (optional)</Label>
                <Input id="display_name" name="display_name" placeholder="Jordan Smith" />
              </div>
              <div className="space-y-space-2xs">
                <Label htmlFor="position_title">Role or title (optional)</Label>
                <Input id="position_title" name="position_title" placeholder="Coordinator" />
              </div>
            </div>

            <div className="space-y-space-2xs">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                name="message"
                rows={3}
                className="min-h-[120px]"
                placeholder="Add supportive context or onboarding steps. Avoid sensitive details."
              />
            </div>

            <div className="flex justify-end">
              <SubmitButton disabled={!rateLimit.allowed} />
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending} className="min-w-[160px]">
      {pending ? 'Sending…' : disabled ? 'Rate limited' : 'Send invite'}
    </Button>
  );
}
