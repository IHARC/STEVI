'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CancelAppointmentFormProps = {
  action: (formData: FormData) => Promise<{ success: boolean; error?: string } | void>;
  appointmentId: string;
  variant?: 'outline' | 'secondary' | 'destructive';
};

function SubmitButton({ variant }: { variant: CancelAppointmentFormProps['variant'] }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant ?? 'destructive'}
      size="sm"
      disabled={pending}
      stateLayerTone={variant === 'destructive' ? 'destructive' : undefined}
    >
      {pending ? 'Cancelling…' : 'Cancel appointment'}
    </Button>
  );
}

export function CancelAppointmentForm({ action, appointmentId, variant }: CancelAppointmentFormProps) {
  return (
    <form
      action={action as unknown as (formData: FormData) => Promise<void>}
      className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
    >
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <Input
        name="cancellation_reason"
        placeholder="Optional reason"
        className="sm:min-w-[200px]"
      />
      <SubmitButton variant={variant} />
    </form>
  );
}
