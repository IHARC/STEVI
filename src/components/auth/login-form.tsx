'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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

type LoginFormValues = {
  next: string;
  contact_method: ContactMethod;
  email: string;
  phone: string;
  password: string;
};

export function LoginForm({ action, nextPath, initialState }: LoginFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<LoginFormValues>({
    defaultValues: {
      next: nextPath,
      contact_method: initialState.contactMethod ?? 'email',
      email: '',
      phone: '',
      password: '',
    },
  });
  const contactMethod = form.watch('contact_method');
  const [formError, setFormError] = useState<string | null>(initialState.error ?? null);

  // Keep the toggle in sync with the last server response (e.g., validation error)
  // without overriding a user-initiated switch before submit. Only react when the
  // action state itself changes.
  useEffect(() => {
    if (!state.contactMethod) return;

    startTransition(() => {
      form.setValue('contact_method', state.contactMethod as ContactMethod);
    });
  }, [form, state.contactMethod]);

  useEffect(() => {
    form.clearErrors();
    setFormError(null);

    if (!state.error) return;

    const normalizedError = state.error.toLowerCase();
    if (contactMethod === 'email' && normalizedError.includes('email')) {
      form.setError('email', { message: state.error });
      return;
    }

    if (contactMethod === 'phone' && normalizedError.includes('phone')) {
      form.setError('phone', { message: state.error });
      return;
    }

    if (normalizedError.includes('password')) {
      form.setError('password', { message: state.error });
      return;
    }

    setFormError(state.error);
  }, [contactMethod, form, state.error]);

  return (
    <Form {...form}>
      <form action={formAction} className="grid gap-6">
        <input type="hidden" {...form.register('next')} />

        {formError ? (
          <Alert variant="destructive" className="text-sm" role="status" aria-live="polite">
            <AlertTitle>We could not sign you in</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="contact_method"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Sign in with</p>
              <FormControl>
                <div className="space-y-3">
                  <input type="hidden" name="contact_method" value={field.value} />
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value as ContactMethod)}
                    variant="outline"
                    size="sm"
                    className="grid gap-2 sm:grid-cols-2"
                    aria-label="Choose how to sign in"
                  >
                    <ToggleGroupItem value="email" aria-label="Email" className="w-full">
                      Email
                    </ToggleGroupItem>
                    <ToggleGroupItem value="phone" aria-label="Phone" className="w-full">
                      Phone
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </FormControl>
            </FormItem>
          )}
        />
        <p className="text-xs text-muted-foreground">Use the email or phone you registered with.</p>

        {contactMethod === 'email' ? (
          <FormField
            control={form.control}
            name="email"
            rules={{ required: 'Email is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.ca"
                    className="bg-background"
                    required
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="phone"
            rules={{ required: 'Phone number is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+16475551234"
                    className="bg-background"
                    required
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="password"
          rules={{ required: 'Password is required' }}
          render={({ field }) => (
            <FormItem className="grid gap-1">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  className="bg-background"
                  required
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <div className="flex justify-end">
                <Link
                  href="/reset-password"
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  Forgot password?
                </Link>
              </div>
            </FormItem>
          )}
        />

        <SubmitButton />

        <p className="text-sm text-muted-foreground">
          Need an account?{' '}
          <Link
            href="/register"
            className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Register here
          </Link>
        </p>

        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1 bg-border/60" />
            <span>Or continue with</span>
            <Separator className="flex-1 bg-border/60" />
          </div>
          <GoogleAuthButton intent="login" nextPath={nextPath} />
        </div>
      </form>
    </Form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full justify-center text-sm font-medium">
      {pending ? 'Signing in...' : 'Sign in'}
    </Button>
  );
}
