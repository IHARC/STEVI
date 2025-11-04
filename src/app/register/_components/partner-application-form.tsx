'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type PartnerApplicationState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

export const PARTNER_APPLICATION_INITIAL_STATE: PartnerApplicationState = {
  status: 'idle',
};

type PartnerApplicationFormProps = {
  action: (state: PartnerApplicationState, formData: FormData) => Promise<PartnerApplicationState>;
  initialState?: PartnerApplicationState;
  nextPath: string;
};

export function PartnerApplicationForm({
  action,
  initialState = PARTNER_APPLICATION_INITIAL_STATE,
  nextPath,
}: PartnerApplicationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const isSuccess = state.status === 'success';

  return (
    <form
      action={formAction}
      className="space-y-space-lg rounded-[var(--md-sys-shape-corner-extra-large)] border border-outline/40 bg-surface p-space-lg shadow-level-1 sm:p-space-xl"
      noValidate
    >
      <input type="hidden" name="next" value={nextPath} />

      <section className="space-y-space-sm">
        <header>
          <p className="text-label-sm uppercase tracking-[0.12em] text-outline">Partner access</p>
          <h1 className="text-title-lg font-medium text-on-surface">Request partner verification</h1>
          <p className="mt-space-xs text-body-sm text-muted">
            Share your agency details so we can confirm the data-sharing agreement and scope your access appropriately.
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
            <AlertTitle>Application submitted</AlertTitle>
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
            <Label htmlFor="role_title">Role or title *</Label>
            <Input
              id="role_title"
              name="role_title"
              required
              maxLength={120}
              placeholder="Outreach coordinator, housing navigator…"
            />
          </div>
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="organization_name">Organization *</Label>
          <Input
            id="organization_name"
            name="organization_name"
            required
            maxLength={180}
            placeholder="Agency name"
            autoComplete="organization"
          />
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="work_email">Work email *</Label>
          <Input
            id="work_email"
            name="work_email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@agency.ca"
          />
          <p className="text-label-sm text-muted">
            Use a work email so our team can confirm your domain and agreement status quickly.
          </p>
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

        <div className="grid gap-space-xs">
          <Label htmlFor="work_phone">Phone number (optional)</Label>
          <Input
            id="work_phone"
            name="work_phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="+16475551234"
          />
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="programs_supported">Which IHARC programs or teams will you support?</Label>
          <Textarea
            id="programs_supported"
            name="programs_supported"
            rows={3}
            placeholder="Encampment response, Health outreach, Resource publishing…"
          />
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="data_requirements">What data do you need access to?</Label>
          <Textarea
            id="data_requirements"
            name="data_requirements"
            rows={3}
            placeholder="Example: Upload case notes, view client referrals for housing program, update shared outreach schedules."
          />
        </div>

        <div className="space-y-space-sm rounded-[var(--md-sys-shape-corner-medium)] border border-outline/30 p-space-md">
          <ConsentCheckbox
            id="consent_privacy_partner"
            name="consent_privacy"
            label="I confirm our agency has (or is pursuing) a data-sharing agreement with IHARC."
            required
          />
          <ConsentCheckbox
            id="consent_terms_partner"
            name="consent_terms"
            label="I agree to the portal Terms, Privacy Policy, and audit logging expectations."
            required
          />
          <ConsentCheckbox
            id="consent_notifications_partner"
            name="consent_notifications"
            label="Send me partner onboarding resources and policy updates."
          />
        </div>
      </section>

      <div className="flex items-center justify-between gap-space-md">
        <p className="text-label-sm text-muted">
          Partner access stays pending until IHARC staff review your application and confirm least-privilege scopes.
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
