'use client';

import { useEffect, type FormEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Checkbox } from '@shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { FormSubmit } from './FormSubmit';
import type { OnboardingActionState } from '@/app/(client)/onboarding/actions';
import { consentSchema, type ConsentFormValues } from '../schemas';
import type { PolicyContent } from '../types';

export type ConsentCardProps = {
  onSubmit: (formData: FormData) => void;
  state: OnboardingActionState;
  personId: number | null;
  policies: { service: PolicyContent | null; privacy: PolicyContent | null };
  disabled?: boolean;
};

export function ConsentCard({ onSubmit, state, personId, policies, disabled }: ConsentCardProps) {
  const policyMissing = !policies.service || !policies.privacy;
  const form = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      person_id: personId ? String(personId) : '',
      consent_service_agreement: false,
      consent_privacy: false,
    },
  });

  useEffect(() => {
    form.reset({
      person_id: personId ? String(personId) : '',
      consent_service_agreement: false,
      consent_privacy: false,
    });
  }, [form, personId]);

  const handleValidation = async (event: FormEvent<HTMLFormElement>) => {
    const valid = await form.trigger();
    if (!valid) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Card className="border-border/40 bg-background">
      <CardHeader>
        <CardTitle className="text-xl">2. Service agreement & privacy</CardTitle>
        <CardDescription>Review the current IHARC policies and confirm you agree.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={onSubmit} className="space-y-4" onSubmit={handleValidation}>
            <input type="hidden" name="person_id" value={form.watch('person_id')} />
            <fieldset disabled={disabled} className="space-y-4">
              {policyMissing ? (
                <Alert variant="destructive">
                  <AlertTitle>Policy copy missing</AlertTitle>
                  <AlertDescription>Ask an admin to publish the service agreement and privacy notice before continuing.</AlertDescription>
                </Alert>
              ) : (
                <>
                  <PolicyBlock
                    title={policies.service!.title}
                    summary={policies.service!.shortSummary}
                    bodyHtml={policies.service!.bodyHtml}
                  />
                  <PolicyBlock
                    title={policies.privacy!.title}
                    summary={policies.privacy!.shortSummary}
                    bodyHtml={policies.privacy!.bodyHtml}
                  />
                </>
              )}

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="consent_service_agreement"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 text-sm text-foreground">
                      <input type="hidden" name="consent_service_agreement" value={field.value ? 'on' : ''} />
                      <FormControl>
                        <Checkbox
                          id="consent_service_agreement"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormLabel htmlFor="consent_service_agreement" className="font-normal">
                        I agree to the Client Service Agreement. <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="consent_privacy"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 text-sm text-foreground">
                      <input type="hidden" name="consent_privacy" value={field.value ? 'on' : ''} />
                      <FormControl>
                        <Checkbox
                          id="consent_privacy"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormLabel htmlFor="consent_privacy" className="font-normal">
                        I acknowledge the Privacy & Data Protection Notice. <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>

            {state.status === 'error' ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to save consent</AlertTitle>
                <AlertDescription>{state.message ?? 'Try again in a moment.'}</AlertDescription>
              </Alert>
            ) : null}
            {state.status === 'success' ? (
              <Alert variant="default" className="border-primary/30 bg-primary/10 text-primary">
                <AlertTitle>Consent recorded</AlertTitle>
                <AlertDescription>Your confirmation is saved.</AlertDescription>
              </Alert>
            ) : null}

            <FormSubmit disabled={disabled || policyMissing} pendingLabel="Recording…">
              Record consent
            </FormSubmit>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function PolicyBlock({ title, summary, bodyHtml }: { title: string; summary: string; bodyHtml: string }) {
  return (
    <div className="space-y-1 rounded-2xl border border-border/40 bg-card p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <p className="text-sm text-foreground/80">{summary}</p>
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-primary">Read full text</summary>
        <div className="prose prose-sm mt-1 text-foreground" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      </details>
    </div>
  );
}
