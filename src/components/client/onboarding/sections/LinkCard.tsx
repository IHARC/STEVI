'use client';

import { useEffect, type FormEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Form } from '@shared/ui/form';
import { FormSubmit } from './FormSubmit';
import type { OnboardingActionState } from '@/app/(client)/onboarding/actions';
import type { OnboardingActor } from '@/lib/onboarding/utils';
import { linkSchema, type LinkFormValues } from '../schemas';

export type LinkCardProps = {
  onSubmit: (formData: FormData) => void;
  state: OnboardingActionState;
  personId: number | null;
  hasAccountLink: boolean;
  actor: OnboardingActor;
  disabled?: boolean;
};

export function LinkCard({ onSubmit, state, personId, hasAccountLink, actor, disabled }: LinkCardProps) {
  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: { person_id: personId ? String(personId) : '' },
  });

  useEffect(() => {
    form.reset({ person_id: personId ? String(personId) : '' });
  }, [form, personId]);

  const handleValidation = async (event: FormEvent<HTMLFormElement>) => {
    const valid = await form.trigger();
    if (!valid) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const clientMode = actor === 'client';

  return (
    <Card className="border-border/40 bg-background">
      <CardHeader>
        <CardTitle className="text-xl">4. Account link</CardTitle>
        <CardDescription>Connect this portal login to the person record.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-4 text-sm text-foreground/80">
          {clientMode ? (
            <p>
              Linking keeps your portal access connected to this client record. If you change emails or phone numbers later, contact IHARC to update the link.
            </p>
          ) : (
            <p>
              Assisted onboarding keeps the client&apos;s account separate. Share the onboarding link or ask them to sign in to link later.
            </p>
          )}
        </div>

        <Form {...form}>
          <form action={onSubmit} className="space-y-3" onSubmit={handleValidation}>
            <input type="hidden" name="person_id" value={form.watch('person_id')} />
            {state.status === 'error' ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to link right now</AlertTitle>
                <AlertDescription>{state.message ?? 'Try again in a moment.'}</AlertDescription>
              </Alert>
            ) : null}
            {state.status === 'success' ? (
              <Alert variant="default" className="border-primary/30 bg-primary/10 text-primary">
                <AlertTitle>Account linked</AlertTitle>
                <AlertDescription>Your account is connected to this record.</AlertDescription>
              </Alert>
            ) : null}
            <FormSubmit disabled={disabled || !clientMode || hasAccountLink} pendingLabel="Linking…">
              {hasAccountLink ? 'Account linked' : 'Link my account'}
            </FormSubmit>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
