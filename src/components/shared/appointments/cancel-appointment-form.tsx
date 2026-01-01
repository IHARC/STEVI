'use client';

import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { useFormStatus } from 'react-dom';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import type { ActionState } from '@/lib/server-actions/validate';

type CancelAppointmentFormProps = {
  action: (formData: FormData) => Promise<ActionState<{ message?: string }>>;
  appointmentId: string;
  variant?: 'outline' | 'secondary' | 'destructive';
};

type CancelAppointmentValues = {
  appointment_id: string;
  cancellation_reason: string;
};

type CancelActionState = ActionState<{ message?: string }>;

const initialState: CancelActionState = { status: 'idle' };

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
  const [state, formAction] = useActionState(
    (_prev: CancelActionState, formData: FormData) => action(formData),
    initialState,
  );
  const form = useForm<CancelAppointmentValues>({
    defaultValues: {
      appointment_id: appointmentId,
      cancellation_reason: '',
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
        {errorMessage ? <p className="text-xs text-destructive">{errorMessage}</p> : null}
        {successMessage ? <p className="text-xs text-emerald-600">{successMessage}</p> : null}
      </div>
    </Form>
  );
}
