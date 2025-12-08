'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';

export type PasswordFormState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

type ProfilePasswordFormProps = {
  action: (state: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
  initialState: PasswordFormState;
  hasEmail: boolean;
  hasPhone: boolean;
};

export function ProfilePasswordForm({ action, initialState, hasEmail, hasPhone }: ProfilePasswordFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<{ current_password: string; new_password: string; confirm_password: string }>({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  return (
    <section className="grid gap-6 rounded-3xl border border-border/40 bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-medium text-foreground">Password</h2>
        <p className="text-sm text-foreground/70">
          {hasEmail && hasPhone
            ? 'Update the password used with your email or phone sign in.'
            : hasEmail
              ? 'Update the password used with your email sign in.'
              : 'Update the password used with your phone sign in.'}
        </p>
      </div>

      <Form {...form}>
        <form action={formAction} className="grid gap-3">
          <FormField
            control={form.control}
            name="current_password"
            rules={{ required: 'Enter your current password' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="current_password">Current password</FormLabel>
                <FormControl>
                  <Input id="current_password" type="password" autoComplete="current-password" required {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="new_password"
            rules={{ required: 'Create a new password' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="new_password">New password</FormLabel>
                <FormControl>
                  <Input id="new_password" type="password" autoComplete="new-password" minLength={8} required {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm_password"
            rules={{ required: 'Confirm your new password' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="confirm_password">Confirm new password</FormLabel>
                <FormControl>
                  <Input id="confirm_password" type="password" autoComplete="new-password" minLength={8} required {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {state.error ? (
            <Alert variant="destructive" className="text-sm">
              <AlertTitle>We could not update your password</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {state.status === 'success' && state.message ? (
            <Alert className="border-secondary bg-secondary/15 text-secondary-foreground">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <PasswordSubmitButton />
        </form>
      </Form>
    </section>
  );
}

function PasswordSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full justify-center sm:w-auto">
      {pending ? 'Updating...' : 'Update password'}
    </Button>
  );
}
