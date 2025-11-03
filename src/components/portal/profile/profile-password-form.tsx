'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

  return (
    <section className="grid gap-4 rounded-2xl border border-outline/20 bg-surface p-6 shadow-subtle">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-on-surface">Password</h2>
        <p className="text-sm text-on-surface/70">
          {hasEmail && hasPhone
            ? 'Update the password used with your email or phone sign in.'
            : hasEmail
              ? 'Update the password used with your email sign in.'
              : 'Update the password used with your phone sign in.'}
        </p>
      </div>

      <form action={formAction} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="current_password">Current password</Label>
          <Input id="current_password" name="current_password" type="password" autoComplete="current-password" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new_password">New password</Label>
          <Input id="new_password" name="new_password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm_password">Confirm new password</Label>
          <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" required minLength={8} />
        </div>

        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not update your password</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {state.status === 'success' && state.message ? (
          <Alert className="border-success/40 bg-success/10 text-success">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <PasswordSubmitButton />
      </form>
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
