'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientPreviewGuard } from '@/components/layout/client-preview-guard';
import { submitSupportMessage } from './actions';
import { useToast } from '@/components/ui/use-toast';
import { useWorkspaceContext } from '@/components/providers/workspace-provider';
import { Icon } from '@/components/ui/icon';
import { MessageCircle } from 'lucide-react';

const initialState = { success: false } as const;

export function SupportComposer() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(submitSupportMessage, initialState);
  const { toast } = useToast();
  const { isClientPreview } = useWorkspaceContext();

  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Message sent',
        description: state.message ?? 'The outreach team will respond within one business day.',
      });
      // Close after notifying the user to avoid extra renders.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    } else if (state?.error) {
      toast({
        title: 'Unable to send message',
        description: state.error,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  const triggerLabel = useMemo(
    () => (isClientPreview ? 'Exit preview to message' : 'Message the team'),
    [isClientPreview],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="fixed bottom-4 right-4 z-30 rounded-full shadow-level-3"
          variant="secondary"
          disabled={isClientPreview}
        >
          <Icon icon={MessageCircle} size="sm" />
          <span className="ml-space-2xs">{triggerLabel}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-outline/30 bg-surface">
        <SheetHeader>
          <SheetTitle className="text-left">Message the team</SheetTitle>
          <p className="text-body-sm text-muted-foreground text-left">
            Share what you need. We respond within one business day using your preferred contact method.
          </p>
        </SheetHeader>

        <ClientPreviewGuard message="Exit preview to send messages as the client.">
          <form action={formAction} className="mt-space-md space-y-space-md">
            <div className="space-y-space-2xs">
              <Label htmlFor="support-message">What do you need help with?</Label>
              <Textarea
                id="support-message"
                name="message"
                minLength={10}
                maxLength={2000}
                required
                placeholder="Share context, dates, or what you’d like us to do."
                className="min-h-[160px]"
              />
              <p className="text-label-sm text-muted-foreground">Avoid sharing sensitive health details. We’ll keep this secure.</p>
            </div>

            <div className="space-y-space-2xs">
              <Label htmlFor="preferred-contact">Preferred contact</Label>
              <Select name="preferredContact" defaultValue="phone">
                <SelectTrigger id="preferred-contact" aria-label="Preferred contact method">
                  <SelectValue placeholder="Select contact method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone call</SelectItem>
                  <SelectItem value="sms">Text message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="in_person">In person</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-space-sm text-label-sm text-muted-foreground">
              <span>We’ll respond within one business day. For urgent changes, call 289-555-0100.</span>
              <Button type="submit" className="ml-auto">Send message</Button>
            </div>
          </form>
        </ClientPreviewGuard>
      </SheetContent>
    </Sheet>
  );
}
