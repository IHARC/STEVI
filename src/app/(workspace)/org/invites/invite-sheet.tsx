'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@shared/ui/sheet';
import { useToast } from '@shared/ui/use-toast';
import type { RateLimitResult } from '@/lib/rate-limit';
import { createOrgInviteAction, type OrgInviteFormState } from './actions';
import { ORG_INVITE_RATE_LIMIT, formatInviteCooldown } from './constants';

type InviteSheetProps = {
  rateLimit: RateLimitResult;
};

const initialState: OrgInviteFormState = { status: 'idle' };

type InviteFormValues = {
  email: string;
  display_name: string;
  position_title: string;
  message: string;
};

export function InviteSheet({ rateLimit }: InviteSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(createOrgInviteAction, initialState);
  const form = useForm<InviteFormValues>({
    defaultValues: {
      email: '',
      display_name: '',
      position_title: '',
      message: '',
    },
  });

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Invitation sent', description: 'Recipients receive a secure link tied to your organization.' });
      form.reset();
      router.refresh();
    } else if (state.status === 'error' && state.message) {
      toast({ title: 'Invite not sent', description: state.message, variant: 'destructive' });
    }
  }, [state, toast, router, form]);

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
          <SheetTitle className="text-xl">Send an invitation</SheetTitle>
          <SheetDescription>
            Invitations are scoped to your organization by RLS. We include your name and optional message.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border/40 bg-muted p-3">
            <Badge variant={rateLimit.allowed ? 'secondary' : 'destructive'} className="capitalize">
              {rateLimit.allowed ? 'Limit clear' : 'Rate limited'}
            </Badge>
            <p className="text-xs text-right text-muted-foreground">{limitMessage}</p>
          </div>

          <Form {...form}>
            <form action={formAction} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                rules={{ required: 'Email is required' }}
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="person@example.org"
                        aria-required
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel htmlFor="display_name">Display name (optional)</FormLabel>
                      <FormControl>
                        <Input id="display_name" placeholder="Jordan Smith" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position_title"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel htmlFor="position_title">Role or title (optional)</FormLabel>
                      <FormControl>
                        <Input id="position_title" placeholder="Coordinator" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="message">Message (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        id="message"
                        rows={3}
                        className="min-h-[120px]"
                        placeholder="Add supportive context or onboarding steps. Avoid sensitive details."
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <SubmitButton disabled={!rateLimit.allowed} />
              </div>
            </form>
          </Form>
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
