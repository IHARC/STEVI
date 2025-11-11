'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type VolunteerApplicationState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

export const VOLUNTEER_APPLICATION_INITIAL_STATE: VolunteerApplicationState = {
  status: 'idle',
};

type VolunteerApplicationFormProps = {
  action: (state: VolunteerApplicationState, formData: FormData) => Promise<VolunteerApplicationState>;
  initialState?: VolunteerApplicationState;
  nextPath: string;
  csrfToken: string;
};

export function VolunteerApplicationForm({
  action,
  initialState = VOLUNTEER_APPLICATION_INITIAL_STATE,
  nextPath,
  csrfToken,
}: VolunteerApplicationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const isSuccess = state.status === 'success';

  return (
    <form
      action={formAction}
      className="space-y-space-lg rounded-[var(--md-sys-shape-corner-extra-large)] border border-outline/40 bg-surface p-space-lg shadow-level-1 sm:p-space-xl"
      noValidate
    >
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="csrf_token" value={csrfToken} />

      <section className="space-y-space-sm">
        <header>
          <p className="text-label-sm uppercase tracking-[0.12em] text-outline">Volunteer onboarding</p>
          <h1 className="text-title-lg font-medium text-on-surface">Apply as a volunteer</h1>
          <p className="mt-space-xs text-body-sm text-muted-foreground">
            Tell us how you’d like to help neighbours. We’ll reach out about orientation, background checks, and shifts.
          </p>
        </header>

        {state.error ? (
          <Alert variant="destructive" className="text-body-sm">
            <AlertTitle>We couldn’t submit your application</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {isSuccess && state.message ? (
          <Alert className="border-primary/30 bg-primary/10 text-body-sm text-on-primary-container">
            <AlertTitle>Volunteer application received</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="space-y-space-md">
        <div className="grid gap-space-sm md:grid-cols-2">
          <div className="grid gap-space-xs">
            <Label htmlFor="full_name">Your name *</Label>
            <Input id="full_name" name="full_name" required maxLength={120} autoComplete="name" />
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="pronouns">Pronouns (optional)</Label>
            <Input id="pronouns" name="pronouns" maxLength={80} placeholder="She/her, they/them…" />
          </div>
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.ca" />
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+16475551234" />
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="interests">How would you like to help? *</Label>
          <Textarea
            id="interests"
            name="interests"
            rows={3}
            required
            placeholder="Example: outreach meal prep, winter clothing drives, art drop-ins, transportation."
          />
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="availability">Availability (optional)</Label>
          <Textarea
            id="availability"
            name="availability"
            rows={2}
            placeholder="Weekday evenings, weekends, once a month, etc."
          />
        </div>

        <div className="grid gap-space-sm md:grid-cols-2">
          <div className="grid gap-space-xs">
            <Label htmlFor="password">Create a password *</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              placeholder="At least 12 characters"
            />
          </div>
          <div className="grid gap-space-xs">
            <Label htmlFor="password_confirm">Confirm password *</Label>
            <Input
              id="password_confirm"
              name="password_confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              placeholder="Re-enter your password"
            />
          </div>
        </div>

        <div className="space-y-space-sm rounded-[var(--md-sys-shape-corner-medium)] border border-outline/30 p-space-md">
          <ConsentCheckbox
            id="consent_privacy_volunteer"
            name="consent_privacy"
            label="I understand IHARC will store my application and contact me about volunteer onboarding."
            required
          />
          <ConsentCheckbox
            id="consent_terms_volunteer"
            name="consent_terms"
            label="I agree to follow IHARC’s volunteer code of conduct and privacy practices."
            required
          />
          <ConsentCheckbox
            id="consent_screening"
            name="consent_screening"
            label="I consent to required screenings (background checks, references) before volunteering."
            required
          />
        </div>
      </section>

      <div className="flex items-center justify-between gap-space-md">
        <p className="text-label-sm text-muted-foreground">
          Volunteers receive limited access until screening and training are complete. You can withdraw at any time.
        </p>
        <SubmitButton isSuccess={isSuccess} />
      </div>
    </form>
  );
}

function ConsentCheckbox({
  id,
  name,
  label,
  required = false,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-space-sm text-body-sm text-on-surface">
      <Checkbox id={id} name={name} required={required} className="mt-1" />
      <span>
        {label} {required ? <span className="text-error">*</span> : null}
      </span>
    </label>
  );
}

function SubmitButton({ isSuccess }: { isSuccess: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || isSuccess} className="min-w-[180px] justify-center">
      {pending ? 'Submitting...' : isSuccess ? 'Application sent' : 'Submit application'}
    </Button>
  );
}
