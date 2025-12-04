'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';

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

  // Keep the toggle in sync with the last server response (e.g., validation error)
  // without overriding a user-initiated switch before submit. Only react when the
  // action state itself changes.
  useEffect(() => {
    if (!state.contactMethod) return;

    startTransition(() => {
      setContactMethod(state.contactMethod as ContactMethod);
    });
  }, [state.contactMethod]);

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

      <div className="space-y-space-sm">
        <p className="text-label-sm font-semibold uppercase tracking-label-uppercase text-on-surface-variant/80">
          Sign in with
        </p>
        <ToggleGroup
          type="single"
          value={contactMethod}
          onValueChange={(value) => value && setContactMethod(value as ContactMethod)}
          variant="outline"
          size="sm"
          className="grid gap-space-xs sm:grid-cols-2"
          aria-label="Choose how to sign in"
        >
          <ToggleGroupItem
            value="email"
            aria-label="Email"
            className="w-full"
          >
            Email
          </ToggleGroupItem>
          <ToggleGroupItem
            value="phone"
            aria-label="Phone"
            className="w-full"
          >
            Phone
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-label-sm text-on-surface-variant">Use the email or phone you registered with.</p>
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
        <Label htmlFor="password">Password</Label>
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
        <div className="flex justify-end">
          <Link
            href="/reset-password"
            className="text-label-sm font-medium text-on-surface-variant underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <SubmitButton />

      <p className="text-body-sm text-on-surface-variant">
        Need an account?{' '}
        <Link
          href="/register"
          className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Register here
        </Link>
      </p>

      <div className="space-y-space-sm pt-space-xs">
        <div className="flex items-center gap-space-sm text-label-sm text-on-surface-variant">
          <Separator className="flex-1 bg-outline-variant/60" />
          <span>Or continue with</span>
          <Separator className="flex-1 bg-outline-variant/60" />
        </div>
        <GoogleAuthButton intent="login" nextPath={nextPath} />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full justify-center text-label-lg font-medium">
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}
