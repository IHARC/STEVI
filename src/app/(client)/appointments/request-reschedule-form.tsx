'use client';

import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { useFormStatus } from 'react-dom';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import type { ActionState } from '@/lib/server-actions/validate';

type RequestRescheduleFormProps = {
  action: (formData: FormData) => Promise<ActionState<{ message?: string }>>;
  appointmentId: string;
};

type RescheduleFormValues = {
  appointment_id: string;
  requested_window: string;
  location_type: string;
  meeting_url: string;
  location: string;
};

type RescheduleActionState = ActionState<{ message?: string }>;

const initialState: RescheduleActionState = { status: 'idle' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? 'Sending…' : 'Request reschedule'}
    </Button>
  );
}

export function RequestRescheduleForm({ action, appointmentId }: RequestRescheduleFormProps) {
  const [state, formAction] = useActionState(
    (_prev: RescheduleActionState, formData: FormData) => action(formData),
    initialState,
  );
  const form = useForm<RescheduleFormValues>({
    defaultValues: {
      appointment_id: appointmentId,
      requested_window: '',
      location_type: 'in_person',
      meeting_url: '',
      location: '',
    },
  });
  const resolvedState = 'status' in state ? null : state;
  const errorMessage = resolvedState && !resolvedState.ok ? resolvedState.error : null;
  const successMessage = resolvedState && resolvedState.ok ? resolvedState.data?.message : null;

  return (
    <Form {...form}>
      <div className="space-y-1">
        <form
          action={formAction}
          className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
        >
          <input type="hidden" {...form.register('appointment_id')} />
          <FormField
            control={form.control}
            name="requested_window"
            rules={{ required: 'Add your preferred window' }}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Preferred time window</FormLabel>
                <FormControl>
                  <Input
                    id="requested_window"
                    required
                    placeholder="Example: next Tuesday after 3pm"
                    className="sm:min-w-[240px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location_type"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="sr-only">Meeting type</FormLabel>
                <input type="hidden" name="location_type" value={field.value} />
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="sm:w-[180px]">
                      <SelectValue placeholder="Meeting type" />
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
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="meeting_url"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Meeting link or phone</FormLabel>
                <FormControl>
                  <Input
                    id="meeting_url"
                    placeholder="Optional link or call-back number"
                    className="sm:min-w-[200px]"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Preferred location</FormLabel>
                <FormControl>
                  <Input
                    id="location"
                    placeholder="Preferred location (optional)"
                    className="sm:min-w-[200px]"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <SubmitButton />
        </form>
        {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
        {successMessage ? <p className="text-xs text-emerald-600">{successMessage}</p> : null}
      </div>
    </Form>
  );
}
