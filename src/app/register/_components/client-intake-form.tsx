'use client';

import { useActionState, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Form } from '@shared/ui/form';
import {
  AdditionalContextSection,
  ContactPreferenceSection,
  ConsentSection,
  DemographicsSection,
  IdentitySection,
  SafetySection,
} from './client-intake/sections';
import type { ClientIntakeFormValues, ContactChoice } from './client-intake/types';

export type ClientIntakeFormState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
  portalCode?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  warnings?: string[];
};

export const CLIENT_INTAKE_INITIAL_STATE: ClientIntakeFormState = {
  status: 'idle',
};

type ClientIntakeFormProps = {
  action: (state: ClientIntakeFormState, formData: FormData) => Promise<ClientIntakeFormState>;
  initialState?: ClientIntakeFormState;
  nextPath: string;
};

export function ClientIntakeForm({ action, initialState = CLIENT_INTAKE_INITIAL_STATE, nextPath }: ClientIntakeFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<ClientIntakeFormValues>({
    defaultValues: {
      next: nextPath,
      contact_choice: 'email',
      contact_email: '',
      contact_phone: '',
      password: '',
      password_confirm: '',
      chosen_name: '',
      legal_name: '',
      pronouns: '',
      safe_call: false,
      safe_text: false,
      safe_voicemail: false,
      contact_window: 'anytime',
      dob_month: '',
      dob_year: '',
      postal_code: '',
      indigenous_identity: '',
      disability: '',
      gender_identity: '',
      consent_privacy: false,
      consent_contact: false,
      consent_terms: false,
      additional_context: '',
    },
  });

  const contactChoice = form.watch('contact_choice');
  const shouldHideCredentials = contactChoice === 'none';
  const isSuccess = state.status === 'success';
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    const isValid = await form.trigger();
    if (!isValid) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  useEffect(() => {
    if (state.status === 'success' && state.contactEmail) {
      form.setValue('contact_email', state.contactEmail);
    }
    if (state.status === 'success' && state.contactPhone) {
      form.setValue('contact_phone', state.contactPhone);
    }
  }, [form, state.contactEmail, state.contactPhone, state.status]);

  const currentYear = new Date().getFullYear();
  const dobYears = useMemo(() => {
    const years: number[] = [];
    for (let year = currentYear; year >= currentYear - 110; year -= 1) {
      years.push(year);
    }
    return years;
  }, [currentYear]);

  return (
    <Form {...form}>
      <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="next" value={nextPath} />

        <section className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-foreground">Request support or services</h1>
            <p className="text-sm text-muted-foreground">
              Share the best way to reach you and any context we should know. You can claim an online account later with the code we send.
            </p>
          </div>
          {state.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to submit your intake</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {isSuccess ? (
            <Alert className="border-primary bg-primary/10 text-primary">
              <AlertTitle>Intake received</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{state.message ?? 'Thanks for sharing your details. An outreach worker will follow up shortly.'}</p>
                {state.portalCode ? (
                  <p className="font-mono text-sm">
                    Your IHARC code: <strong>{state.portalCode}</strong>. Keep this somewhere safe — you can use it later to claim your online account.
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
        </section>

        <ContactPreferenceSection form={form} contactChoice={contactChoice as ContactChoice} shouldHideCredentials={shouldHideCredentials} />

        <IdentitySection form={form} />

        <SafetySection form={form} />

        <DemographicsSection form={form} dobYears={dobYears} />

        <ConsentSection form={form} />

        <AdditionalContextSection form={form} />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              We’ll email or text a confirmation as soon as possible. Staff can also look you up with your name and code.
            </p>
            {state.warnings?.length ? (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {state.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <SubmitButton isSuccess={isSuccess} />
        </div>
      </form>
    </Form>
  );
}

function SubmitButton({ isSuccess }: { isSuccess: boolean }) {
  const { pending } = useFormStatus();
  const label = isSuccess ? 'Intake logged' : 'Submit intake';
  const pendingLabel = 'Submitting...';

  return (
    <Button type="submit" disabled={pending || isSuccess} className="min-w-[160px] justify-center">
      {pending ? pendingLabel : label}
    </Button>
  );
}
