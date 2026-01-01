'use client';

import { useActionState } from 'react';

import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select';
import type { ActionState } from '@/lib/server-actions/validate';

type RequestAppointmentFormProps = {
  action: (
    state: AppointmentRequestState,
    formData: FormData,
  ) => Promise<AppointmentRequestState>;
  profileDisplayName: string | null | undefined;
};

type AppointmentRequestState = ActionState<{ message?: string }>;

type RequestAppointmentValues = {
  reason: string;
  preferred_date: string;
  staff_preference: string;
  location_type: string;
  meeting_url: string;
};

const initialState: AppointmentRequestState = { status: 'idle' };

export function RequestAppointmentForm({ action, profileDisplayName }: RequestAppointmentFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<RequestAppointmentValues>({
    defaultValues: {
      reason: '',
      preferred_date: '',
      staff_preference: '',
      location_type: 'in_person',
      meeting_url: '',
    },
  });
  const profileLabel = profileDisplayName ?? 'your profile';
  const resolvedState = 'status' in state ? null : state;
  const successMessage = resolvedState && resolvedState.ok ? resolvedState.data?.message : null;
  const errorMessage = resolvedState && !resolvedState.ok ? resolvedState.error : null;

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-4" aria-describedby="request-form-feedback">
        <FormField
          control={form.control}
          name="reason"
          rules={{ required: 'Please share what you want to discuss' }}
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel htmlFor="reason" className="text-sm font-semibold text-foreground">
                What do you want to discuss?
              </FormLabel>
              <FormControl>
                <Textarea
                  id="reason"
                  required
                  minLength={8}
                  placeholder="Example: I need help rescheduling my RAAM visit or getting new ID."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="preferred_date"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel htmlFor="preferred-date" className="text-sm font-semibold text-foreground">
                Preferred date or time window <span className="text-foreground/60">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  id="preferred-date"
                  placeholder="Example: mornings this week or after 3pm next Tuesday"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="staff_preference"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel htmlFor="staff-preference" className="text-sm font-semibold text-foreground">
                Preferred staff member <span className="text-foreground/60">(optional)</span>
              </FormLabel>
              <FormControl>
                <Input
                  id="staff-preference"
                  placeholder="Example: Jordan, Morgan, peer navigator, or whoever is available"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="location_type"
            rules={{ required: 'Select a meeting type' }}
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm font-semibold text-foreground" htmlFor="location-type">
                  Meeting type
                </FormLabel>
                <input type="hidden" name="location_type" value={field.value} />
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="location-type">
                      <SelectValue placeholder="Select a meeting type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">In person</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="field">Field / outreach</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="meeting_url"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm font-semibold text-foreground" htmlFor="meeting-url">
                  Meeting link or phone (optional)
                </FormLabel>
                <FormControl>
                  <Input id="meeting-url" placeholder="Zoom/Teams link or call-back number" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Submitting will notify the outreach coordination queue linked with STEVI Ops for {profileLabel}.
        </p>
        <Button type="submit" className="w-full sm:w-auto">
          Send request
        </Button>
        <div
          id="request-form-feedback"
          aria-live="polite"
          className="space-y-2 text-sm"
        >
          {successMessage ? (
            <Alert variant="default" className="border-primary/30 bg-primary/10 text-primary">
              <AlertTitle>Request sent</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}
          {errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to send request</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
