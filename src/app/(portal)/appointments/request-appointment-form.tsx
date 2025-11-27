'use client';

import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppointmentRequestState } from './types';

type RequestAppointmentFormProps = {
  action: (
    state: AppointmentRequestState,
    formData: FormData,
  ) => Promise<AppointmentRequestState>;
  profileDisplayName: string | null | undefined;
};

const initialState: AppointmentRequestState = { status: 'idle' };

export function RequestAppointmentForm({ action, profileDisplayName }: RequestAppointmentFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const profileLabel = profileDisplayName ?? 'your profile';

  return (
    <form action={formAction} className="space-y-4" aria-describedby="request-form-feedback">
      <div className="space-y-1.5">
        <label htmlFor="reason" className="text-body-md font-semibold text-on-surface">
          What do you want to discuss?
        </label>
        <Textarea
          id="reason"
          name="reason"
          required
          minLength={8}
          placeholder="Example: I need help rescheduling my RAAM visit or getting new ID."
          className="min-h-[120px]"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="preferred-date" className="text-body-md font-semibold text-on-surface">
          Preferred date or time window{' '}
          <span className="text-on-surface/60">(optional)</span>
        </label>
        <Input
          id="preferred-date"
          name="preferred_date"
          placeholder="Example: mornings this week or after 3pm next Tuesday"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="staff-preference" className="text-body-md font-semibold text-on-surface">
          Preferred staff member <span className="text-on-surface/60">(optional)</span>
        </label>
        <Input
          id="staff-preference"
          name="staff_preference"
          placeholder="Example: Jordan, Morgan, peer navigator, or whoever is available"
        />
      </div>
      <div className="grid gap-space-sm sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-body-md font-semibold text-on-surface" htmlFor="location-type">
            Meeting type
          </label>
          <Select name="location_type" defaultValue="in_person">
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
        </div>
        <div className="space-y-1.5">
          <label className="text-body-md font-semibold text-on-surface" htmlFor="meeting-url">
            Meeting link or phone (optional)
          </label>
          <Input id="meeting-url" name="meeting_url" placeholder="Zoom/Teams link or call-back number" />
        </div>
      </div>
      <p className="text-body-md text-muted-foreground">
        Submitting will notify the outreach coordination queue linked with STEVI Ops for {profileLabel}.
      </p>
      <Button type="submit" className="w-full sm:w-auto">
        Send request
      </Button>
      <div
        id="request-form-feedback"
        aria-live="polite"
        className="text-body-md"
      >
        {state.status === 'success' ? (
          <p className="text-tertiary">{state.message}</p>
        ) : null}
        {state.status === 'error' ? (
          <p className="text-destructive">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
