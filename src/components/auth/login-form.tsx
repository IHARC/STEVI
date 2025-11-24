'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import { AuthDivider } from '@/components/auth/auth-divider';
import Link from 'next/link';

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

  return (
    <form action={formAction} className="grid gap-space-lg rounded-3xl border border-outline/30 bg-surface-container p-space-lg shadow-level-1">
      <input type="hidden" name="next" value={nextPath} />
      <div className="space-y-space-sm">
        <GoogleAuthButton intent="login" nextPath={nextPath} />
        <AuthDivider />
      </div>

      <fieldset className="space-y-space-sm rounded-xl border border-outline/30 p-space-md">
        <legend className="text-body-sm font-medium text-on-surface">How would you like to sign in?</legend>
        <RadioGroup name="contact_method" value={contactMethod} onValueChange={(value) => setContactMethod(value as ContactMethod)} className="grid gap-space-sm md:grid-cols-2">
          <ContactOption
            id="login-contact-email"
            value="email"
            title="Email"
            description="Use the email and password you registered with."
          />
          <ContactOption
            id="login-contact-phone"
            value="phone"
            title="Phone"
            description="Enter the phone number you verified at registration."
          />
        </RadioGroup>
      </fieldset>

      {contactMethod === 'email' ? (
        <div className="grid gap-space-xs">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.ca" />
        </div>
      ) : (
        <div className="grid gap-space-xs">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required placeholder="+16475551234" />
        </div>
      )}

      <div className="grid gap-space-xs">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {state.error ? (
        <Alert variant="destructive" className="text-body-sm">
          <AlertTitle>We could not sign you in</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-space-sm">
        <SubmitButton />
        <p className="text-body-sm text-muted-foreground">
          Forgot your password?{' '}
          <Link href="/reset-password" className="text-brand underline">
            Reset it here
          </Link>
        </p>
        <p className="text-body-sm text-muted-foreground">
          Need an account?{' '}
          <Link href="/register" className="text-brand underline">
            Register here
          </Link>
        </p>
      </div>
    </form>
  );
}

type ContactOptionProps = {
  id: string;
  value: ContactMethod;
  title: string;
  description: string;
};

function ContactOption({ id, value, title, description }: ContactOptionProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-space-sm rounded-xl border border-outline/40 bg-surface-container p-space-md text-body-sm font-medium text-on-surface shadow-level-1 transition state-layer-color-primary hover:border-primary hover:state-layer-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:state-layer-focus"
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-space-2xs block text-label-sm font-normal text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full justify-center">
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}
