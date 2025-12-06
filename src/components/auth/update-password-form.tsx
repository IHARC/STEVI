'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export type UpdateRecoveredPasswordState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

type UpdateRecoveredPasswordFormProps = {
  action: (
    state: UpdateRecoveredPasswordState,
    formData: FormData,
  ) => Promise<UpdateRecoveredPasswordState>;
  initialState: UpdateRecoveredPasswordState;
};

export function UpdateRecoveredPasswordForm({ action, initialState }: UpdateRecoveredPasswordFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<{ new_password: string; confirm_password: string }>({
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  });

  return (
    <Form {...form}>
      <form action={formAction} className="mx-auto grid w-full max-w-xl gap-6 rounded-2xl border border-border/40 bg-background p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Set a new password</h1>
          <p className="text-sm text-foreground/70">
            You reached this page from a trusted recovery link. Create a new password below to finish resetting your
            account.
          </p>
        </div>

        <FormField
          control={form.control}
          name="new_password"
          rules={{ required: 'Enter a new password' }}
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
                <Input
                  id="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not update your password</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {state.status === 'success' && state.message ? (
          <Alert className="border-secondary bg-secondary/15 text-secondary-foreground">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <SubmitButton disabled={state.status === 'success'} />
      </form>
    </Form>
  );
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="w-full justify-center sm:w-auto">
      {pending ? 'Updating...' : 'Update password'}
    </Button>
  );
}
