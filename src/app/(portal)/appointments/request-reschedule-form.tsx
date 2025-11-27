'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RequestRescheduleFormProps = {
  action: (formData: FormData) => Promise<unknown | void>;
  appointmentId: string;
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
  return (
    <form
      action={action as unknown as (formData: FormData) => Promise<void>}
      className="flex w-full flex-col gap-space-xs sm:w-auto sm:flex-row sm:items-center"
    >
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <Input
        name="requested_window"
        placeholder="Example: next Tuesday after 3pm"
        required
        className="sm:min-w-[240px]"
      />
      <Select name="location_type" defaultValue="in_person">
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
      <Input
        name="meeting_url"
        placeholder="Optional link or call-back number"
        className="sm:min-w-[200px]"
      />
      <Input
        name="location"
        placeholder="Preferred location (optional)"
        className="sm:min-w-[200px]"
      />
      <SubmitButton />
    </form>
  );
}
