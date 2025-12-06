'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormState } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientPreviewGuard } from '@/components/layout/client-preview-guard';
import { submitSupportMessage } from './actions';
import { useToast } from '@/components/ui/use-toast';
import { usePortalLayout } from '@/components/providers/portal-layout-provider';
import { MessageCircle } from 'lucide-react';

const initialState = { success: false } as const;

export function SupportComposer() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(submitSupportMessage, initialState);
  const form = useForm<{ message: string; preferredContact: string }>({
    defaultValues: {
      message: '',
      preferredContact: 'phone',
    },
  });
  const { toast } = useToast();
  const { isClientPreview } = usePortalLayout();

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
          className="fixed bottom-4 right-4 z-30 rounded-full shadow-lg"
          variant="secondary"
          disabled={isClientPreview}
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          <span className="ml-1">{triggerLabel}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-3xl border-t border-border/30 bg-background">
        <SheetHeader>
          <SheetTitle className="text-left">Message the team</SheetTitle>
          <p className="text-sm text-muted-foreground text-left">
            Share what you need. We respond within one business day using your preferred contact method.
          </p>
        </SheetHeader>

        <ClientPreviewGuard message="Exit preview to send messages as the client.">
          <Form {...form}>
            <form action={formAction} className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="message"
                rules={{ required: 'Describe what you need help with', minLength: { value: 10, message: 'Add a few more details.' } }}
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="support-message">What do you need help with?</FormLabel>
                    <FormControl>
                      <Textarea
                        id="support-message"
                        minLength={10}
                        maxLength={2000}
                        required
                        placeholder="Share context, dates, or what you’d like us to do."
                        className="min-h-[160px]"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Avoid sharing sensitive health details. We’ll keep this secure.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredContact"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel htmlFor="preferred-contact">Preferred contact</FormLabel>
                    <FormControl>
                      <div>
                        <input type="hidden" name="preferredContact" value={field.value} />
                        <Select value={field.value} onValueChange={field.onChange}>
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
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>We’ll respond within one business day. For urgent changes, call 289-555-0100.</span>
                <Button type="submit" className="ml-auto">Send message</Button>
              </div>
            </form>
          </Form>
        </ClientPreviewGuard>
      </SheetContent>
    </Sheet>
  );
}
