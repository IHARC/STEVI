'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import { AuthDivider } from '@/components/auth/auth-divider';

type ContactMethod = 'email' | 'phone';

type FormState = {
  error?: string;
  contactMethod?: ContactMethod;
};

type LoginFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  nextPath: string;
  initialState: FormState;
};

export function LoginForm({ action, nextPath, initialState }: LoginFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [contactMethod, setContactMethod] = useState<ContactMethod>(initialState.contactMethod ?? 'email');

  useEffect(() => {
    const nextMethod = state.contactMethod;
    if (!nextMethod || nextMethod === contactMethod) {
      return;
    }
    startTransition(() => {
      setContactMethod(nextMethod);
    });
  }, [state.contactMethod, contactMethod]);

  const normalizedError = state.error?.toLowerCase() ?? '';
  const emailError = contactMethod === 'email' && normalizedError.includes('email') ? state.error : undefined;
  const phoneError = contactMethod === 'phone' && normalizedError.includes('phone') ? state.error : undefined;
  const passwordError = normalizedError.includes('password') ? state.error : undefined;
  const showFormError = Boolean(state.error && !emailError && !phoneError && !passwordError);

  return (
    <form action={formAction} className="grid gap-space-lg">
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="contact_method" value={contactMethod} />

      {showFormError ? (
        <Alert variant="destructive" className="text-body-sm" role="status" aria-live="polite">
          <AlertTitle>We could not sign you in</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-space-2xs">
        <p className="text-label-sm font-semibold uppercase tracking-label-uppercase text-muted-foreground">
          Sign in with
        </p>
        <ToggleGroup
          type="single"
          name="contact_method"
          value={contactMethod}
          onValueChange={(value) => value && setContactMethod(value as ContactMethod)}
          className="grid gap-space-sm sm:grid-cols-2"
          aria-label="Choose how to sign in"
        >
          <ToggleGroupItem
            value="email"
            aria-label="Email"
            className="h-full w-full justify-center rounded-[var(--md-sys-shape-corner-large)] bg-surface-container-low px-space-md py-space-sm text-body-md font-semibold shadow-level-1 data-[state=on]:bg-primary data-[state=on]:text-on-primary data-[state=on]:shadow-level-2"
          >
            <span className="flex flex-col items-center gap-space-2xs text-center">
              <span className="text-label-lg font-semibold">Email</span>
              <span className="text-label-sm font-normal text-on-surface-variant">
                Use your registered email.
              </span>
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="phone"
            aria-label="Phone"
            className="h-full w-full justify-center rounded-[var(--md-sys-shape-corner-large)] bg-surface-container-low px-space-md py-space-sm text-body-md font-semibold shadow-level-1 data-[state=on]:bg-primary data-[state=on]:text-on-primary data-[state=on]:shadow-level-2"
          >
            <span className="flex flex-col items-center gap-space-2xs text-center">
              <span className="text-label-lg font-semibold">Phone</span>
              <span className="text-label-sm font-normal text-on-surface-variant">
                Use your verified number.
              </span>
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {contactMethod === 'email' ? (
        <div className="grid gap-space-xs">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.ca"
            className="bg-surface"
            data-invalid={Boolean(emailError)}
          />
          {emailError ? <p className="text-label-sm text-error">{emailError}</p> : null}
        </div>
      ) : (
        <div className="grid gap-space-xs">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            required
            placeholder="+16475551234"
            className="bg-surface"
            data-invalid={Boolean(phoneError)}
          />
          {phoneError ? <p className="text-label-sm text-error">{phoneError}</p> : null}
        </div>
      )}

      <div className="grid gap-space-2xs">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/reset-password"
            className="text-label-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="bg-surface"
          data-invalid={Boolean(passwordError)}
        />
        {passwordError ? <p className="text-label-sm text-error">{passwordError}</p> : null}
      </div>

      <SubmitButton />

      <p className="text-body-sm text-muted-foreground">
        Need an account?{' '}
        <Link
          href="/register"
          className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Register here
        </Link>
      </p>

      <div className="space-y-space-sm pt-space-xs">
        <AuthDivider label="other sign-in options" />
        <GoogleAuthButton intent="login" nextPath={nextPath} />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full justify-center text-label-lg font-semibold">
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}
