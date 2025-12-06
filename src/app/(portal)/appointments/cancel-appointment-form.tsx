'use client';

import { useForm } from 'react-hook-form';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

type CancelAppointmentFormProps = {
  action: (formData: FormData) => Promise<{ success: boolean; error?: string } | void>;
  appointmentId: string;
  variant?: 'outline' | 'secondary' | 'destructive';
};

type CancelAppointmentValues = {
  appointment_id: string;
  cancellation_reason: string;
};

function SubmitButton({ variant }: { variant: CancelAppointmentFormProps['variant'] }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant ?? 'destructive'}
      size="sm"
      disabled={pending}
    >
      {pending ? 'Cancelling…' : 'Cancel appointment'}
    </Button>
  );
}

export function CancelAppointmentForm({ action, appointmentId, variant }: CancelAppointmentFormProps) {
  const form = useForm<CancelAppointmentValues>({
    defaultValues: {
      appointment_id: appointmentId,
      cancellation_reason: '',
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
          name="cancellation_reason"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel className="sr-only">Cancellation reason</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Optional reason"
                  className="sm:min-w-[200px]"
                />
              </FormControl>
            </FormItem>
          )}
        />
        <SubmitButton variant={variant} />
      </form>
    </Form>
  );
}
