'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type CommunityRegistrationState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

export const COMMUNITY_REGISTRATION_INITIAL_STATE: CommunityRegistrationState = {
  status: 'idle',
};

type CommunityRegistrationFormProps = {
  action: (state: CommunityRegistrationState, formData: FormData) => Promise<CommunityRegistrationState>;
  initialState?: CommunityRegistrationState;
  nextPath: string;
};

export function CommunityRegistrationForm({
  action,
  initialState = COMMUNITY_REGISTRATION_INITIAL_STATE,
  nextPath,
}: CommunityRegistrationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const isSuccess = state.status === 'success';

  return (
    <form
      action={formAction}
      className="space-y-6 rounded-3xl border border-border/40 bg-background p-6 shadow-sm sm:p-8"
      noValidate
    >
      <input type="hidden" name="next" value={nextPath} />

      <section className="space-y-3">
        <header>
          <p className="text-xs uppercase text-muted-foreground">Neighbour updates</p>
          <h1 className="text-xl font-medium text-foreground">Join as a community member</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get email updates about IHARC programs, submit feedback, and follow progress on local initiatives.
          </p>
        </header>

        {state.error ? (
          <Alert variant="destructive" className="text-sm">
            <AlertTitle>We couldn’t create your account</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {isSuccess && state.message ? (
          <Alert className="border-primary bg-primary/10 text-sm text-primary">
            <AlertTitle>Welcome to the IHARC community</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="display_name">Display name *</Label>
          <Input
            id="display_name"
            name="display_name"
            required
            maxLength={80}
            placeholder="Name other neighbours will see"
            autoComplete="nickname"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="email">Email address *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.ca"
          />
          <p className="text-xs text-muted-foreground">
            We’ll send a confirmation email. You can manage notification preferences after signing in.
          </p>
        </div>

        <div className="grid gap-2">
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

        <div className="grid gap-2">
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

        <div className="space-y-3 rounded-xl border border-border/30 p-4">
          <ConsentCheckbox
            id="consent_privacy_community"
            name="consent_privacy"
            label="I understand why IHARC collects my information and how it’s used."
            required
          />
          <ConsentCheckbox
            id="consent_terms_community"
            name="consent_terms"
            label="I agree to the portal Terms and Privacy Policy."
            required
          />
          <ConsentCheckbox
            id="consent_updates"
            name="consent_updates"
            label="Email me community updates, surveys, and program invitations."
          />
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">You can unsubscribe from emails or delete your profile at any time.</p>
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
    <label htmlFor={id} className="flex items-start gap-3 text-sm text-foreground">
      <Checkbox id={id} name={name} required={required} className="mt-1" />
      <span>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </span>
    </label>
  );
}

function SubmitButton({ isSuccess }: { isSuccess: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || isSuccess} className="min-w-[140px] justify-center">
      {pending ? 'Creating...' : isSuccess ? 'Account created' : 'Create account'}
    </Button>
  );
}
