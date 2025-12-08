'use client';

import { useForm } from 'react-hook-form';
import { useFormStatus } from 'react-dom';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';

type RequestRescheduleFormProps = {
  action: (formData: FormData) => Promise<unknown | void>;
  appointmentId: string;
};

type RescheduleFormValues = {
  appointment_id: string;
  requested_window: string;
  location_type: string;
  meeting_url: string;
  location: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? 'Sending…' : 'Request reschedule'}
    </Button>
  );
}

export function RequestRescheduleForm({ action, appointmentId }: RequestRescheduleFormProps) {
  const form = useForm<RescheduleFormValues>({
    defaultValues: {
      appointment_id: appointmentId,
      requested_window: '',
      location_type: 'in_person',
      meeting_url: '',
      location: '',
    },
  });

  return (
    <Form {...form}>
      <form
        action={action as unknown as (formData: FormData) => Promise<void>}
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
    </Form>
  );
}
