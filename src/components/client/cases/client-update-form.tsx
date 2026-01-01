'use client';

import { useActionState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Textarea } from '@shared/ui/textarea';
import { Label } from '@shared/ui/label';
import { submitClientCaseUpdateAction } from '@/lib/cases/actions';
import type { ActionState } from '@/lib/server-actions/validate';

type ClientUpdateFormProps = {
  caseId: number;
};

type ClientUpdateState = ActionState<{ message?: string }>;

const initialState: ClientUpdateState = { status: 'idle' };

export function ClientUpdateForm({ caseId }: ClientUpdateFormProps) {
  const [state, formAction] = useActionState(
    (_prev: ClientUpdateState, formData: FormData) => submitClientCaseUpdateAction(formData),
    initialState,
  );
  const resolvedState = 'status' in state ? null : state;
  const errorMessage = resolvedState && !resolvedState.ok ? resolvedState.error : null;
  const successMessage = resolvedState && resolvedState.ok ? resolvedState.data?.message : null;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="case_id" value={caseId} />
      <div className="grid gap-1">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={4} placeholder="Share an update for your worker" required minLength={8} />
      </div>
      <Button type="submit" className="w-full">Send update</Button>
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to send update</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert>
          <AlertTitle>Update sent</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
