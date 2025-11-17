'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  csrfToken: string;
};

export function UpdateRecoveredPasswordForm({ action, initialState, csrfToken }: UpdateRecoveredPasswordFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mx-auto grid w-full max-w-xl gap-6 rounded-2xl border border-outline/20 bg-surface p-6 shadow-subtle">
      <input type="hidden" name="csrf_token" value={csrfToken} />
      <div className="space-y-2">
        <h1 className="text-headline-md font-semibold text-on-surface">Set a new password</h1>
        <p className="text-body-md text-on-surface/70">
          You reached this page from a trusted recovery link. Create a new password below to finish resetting your
          account.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="new_password">New password</Label>
        <Input id="new_password" name="new_password" type="password" autoComplete="new-password" required minLength={8} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirm_password">Confirm new password</Label>
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      {state.error ? (
        <Alert variant="destructive">
          <AlertTitle>We could not update your password</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === 'success' && state.message ? (
        <Alert className="border-secondary bg-secondary-container text-on-secondary-container">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton disabled={state.status === 'success'} />
    </form>
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
