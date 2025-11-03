'use client';

import { useActionState, useEffect, useState } from 'react';
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
    if (state.contactMethod && state.contactMethod !== contactMethod) {
      setContactMethod(state.contactMethod);
    }
  }, [state.contactMethod, contactMethod]);

  return (
    <form action={formAction} className="mt-8 grid gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="space-y-3">
        <GoogleAuthButton intent="login" nextPath={nextPath} />
        <AuthDivider />
      </div>

      <fieldset className="space-y-3 rounded-xl border border-outline/25 p-4">
        <legend className="text-sm font-semibold text-on-surface">How would you like to sign in?</legend>
        <RadioGroup name="contact_method" value={contactMethod} onValueChange={(value) => setContactMethod(value as ContactMethod)} className="grid gap-3 md:grid-cols-2">
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
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.ca" />
        </div>
      ) : (
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required placeholder="+16475551234" />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not sign you in</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        <SubmitButton />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Forgot your password?{' '}
          <Link href="/reset-password" className="text-brand underline">
            Reset it here
          </Link>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
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
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline/40 bg-surface-container p-3 text-sm font-medium text-on-surface shadow-subtle transition hover:border-primary/40 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-1 block text-xs font-normal text-muted">{description}</span>
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
