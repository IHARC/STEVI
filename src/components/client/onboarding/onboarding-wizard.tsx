'use client';

/* eslint-disable react-hooks/incompatible-library */

import { useEffect, useMemo, type ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Checkbox } from '@shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Progress } from '@shared/ui/progress';
import { Separator } from '@shared/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import {
  INITIAL_ONBOARDING_ACTION_STATE,
  linkAccountToPersonAction,
  recordConsentsAction,
  saveBasicInfoAction,
  saveSharingPreferenceAction,
  type OnboardingActionState,
} from '@/app/(client)/onboarding/actions';
import type { OnboardingStatus } from '@/lib/onboarding/status';
import type { OnboardingActor } from '@/lib/onboarding/utils';

type PolicyContent = {
  slug: string;
  title: string;
  shortSummary: string;
  bodyHtml: string;
};

export type OnboardingPrefill = {
  chosenName: string;
  legalName: string | null;
  pronouns: string | null;
  email: string | null;
  phone: string | null;
  preferredContactMethod: string | null;
  contactWindow: string | null;
  postalCode: string | null;
  dobMonth: number | null;
  dobYear: number | null;
  safeCall: boolean;
  safeText: boolean;
  safeVoicemail: boolean;
  dataSharingConsent: boolean | null;
};

type BasicInfoFormValues = {
  person_id: string;
  chosen_name: string;
  legal_name: string;
  pronouns: string;
  postal_code: string;
  contact_email: string;
  contact_phone: string;
  preferred_contact_method: string;
  contact_window: string;
  dob_month: string;
  dob_year: string;
  safe_call: boolean;
  safe_text: boolean;
  safe_voicemail: boolean;
};

type ConsentFormValues = {
  person_id: string;
  consent_service_agreement: boolean;
  consent_privacy: boolean;
};

type SharingFormValues = {
  person_id: string;
  data_sharing: 'iharc_only' | 'partners';
};

type LinkFormValues = {
  person_id: string;
};

type OnboardingWizardProps = {
  initialStatus: OnboardingStatus;
  prefill: OnboardingPrefill;
  personId: number | null;
  actor: OnboardingActor;
  nextPath?: string | null;
  hasAccountLink?: boolean;
  policies: {
    service: PolicyContent | null;
    privacy: PolicyContent | null;
  };
  partnerBlockedReason?: string | null;
};

type StepState = 'pending' | 'ready' | 'done';

export function OnboardingWizard({
  initialStatus,
  prefill,
  personId: initialPersonId,
  actor,
  nextPath,
  hasAccountLink: initialHasAccountLink = false,
  policies,
  partnerBlockedReason,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [basicState, basicAction] = useFormState(saveBasicInfoAction, INITIAL_ONBOARDING_ACTION_STATE);
  const [consentState, consentAction] = useFormState(recordConsentsAction, INITIAL_ONBOARDING_ACTION_STATE);
  const [sharingState, sharingAction] = useFormState(saveSharingPreferenceAction, INITIAL_ONBOARDING_ACTION_STATE);
  const [linkState, linkAction] = useFormState(linkAccountToPersonAction, INITIAL_ONBOARDING_ACTION_STATE);

  const status = linkState.nextStatus
    ? linkState.nextStatus
    : sharingState.nextStatus
      ? sharingState.nextStatus
      : consentState.nextStatus
        ? consentState.nextStatus
        : basicState.nextStatus
          ? basicState.nextStatus
          : initialStatus;

  const personId = basicState.personId ?? initialPersonId ?? null;
  const hasAccountLink = initialHasAccountLink || linkState.status === 'success';

  useEffect(() => {
    if (actor !== 'client') return;
    if (status.status === 'COMPLETED') {
      const target = nextPath && nextPath.startsWith('/') ? nextPath : '/home';
      const timer = setTimeout(() => router.replace(target), 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, actor, nextPath, router]);

  const completionCount = useMemo(() => {
    const checks = [
      status.hasPerson,
      status.hasServiceAgreementConsent && status.hasPrivacyAcknowledgement,
      status.hasDataSharingPreference,
    ];
    return checks.filter(Boolean).length;
  }, [status]);

  const progressValue = Math.round((completionCount / 3) * 100);
  const blocked = Boolean(partnerBlockedReason);

  const steps: Array<{ id: string; label: string; state: StepState; description: string }> = [
    {
      id: 'info',
      label: 'Basic info',
      state: status.hasPerson ? 'done' : 'ready',
      description: 'Names and safe contact details',
    },
    {
      id: 'consent',
      label: 'Consent',
      state: status.hasServiceAgreementConsent && status.hasPrivacyAcknowledgement ? 'done' : personId ? 'ready' : 'pending',
      description: 'Service agreement and privacy notice',
    },
    {
      id: 'sharing',
      label: 'Data sharing',
      state: status.hasDataSharingPreference ? 'done' : personId ? 'ready' : 'pending',
      description: 'Who can access the record',
    },
    {
      id: 'link',
      label: 'Account link',
      state: actor === 'client' && hasAccountLink ? 'done' : personId ? 'ready' : 'pending',
      description: actor === 'client' ? 'Connect your login to this record' : 'Optional for assisted onboarding',
    },
  ];

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/30 bg-background p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary">
              Onboarding
            </span>
            <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">Finish onboarding to use STEVI</h1>
            <p className="max-w-3xl text-sm text-muted-foreground">
              We need consent and a sharing choice before unlocking appointments, documents, and cases. You can pause and resume at any time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={status.status === 'COMPLETED' ? 'default' : 'secondary'}>
              {status.status === 'COMPLETED' ? 'Completed' : 'In progress'}
            </Badge>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completionCount}/3 required steps</span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {steps.map((step) => (
            <Badge
              key={step.id}
              variant={step.state === 'done' ? 'default' : step.state === 'ready' ? 'outline' : 'secondary'}
              className="flex items-center gap-1"
            >
              {step.label}
              <span className="text-muted-foreground">· {step.state === 'done' ? 'Done' : step.state === 'ready' ? 'Ready' : 'Pending'}</span>
            </Badge>
          ))}
        </div>
        {actor === 'client' && !personId ? (
          <p className="mt-3 rounded-lg border border-border/40 bg-muted px-3 py-1 text-sm text-foreground">
            We need to connect your login to an IHARC record before continuing. Please contact support if you were invited but do not see your record.
          </p>
        ) : null}
        {blocked ? (
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1 text-sm text-destructive">
            {partnerBlockedReason}
          </p>
        ) : null}
      </header>

      {status.status === 'COMPLETED' ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl">Onboarding complete</CardTitle>
            <CardDescription>
              Thanks for confirming. You can continue to the portal — your preferences are saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => router.replace(nextPath && nextPath.startsWith('/') ? nextPath : '/home')}>
              Go to portal
            </Button>
            {actor === 'client' ? null : (
              <Button variant="ghost" onClick={() => router.back()}>
                Go back
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <BasicInfoCard
            onSubmit={basicAction}
            state={basicState}
            personId={personId}
            prefill={prefill}
            disabled={blocked}
          />
          <ConsentCard
            onSubmit={consentAction}
            state={consentState}
            personId={personId}
            policies={policies}
            disabled={!personId || blocked}
          />
          <SharingCard
            onSubmit={sharingAction}
            state={sharingState}
            personId={personId}
            dataSharingConsent={prefill.dataSharingConsent}
            actor={actor}
            disabled={!personId || blocked}
          />
          <LinkCard
            onSubmit={linkAction}
            state={linkState}
            personId={personId}
            hasAccountLink={hasAccountLink}
            actor={actor}
            disabled={!personId || blocked}
          />
        </div>

        <aside className="space-y-4 rounded-3xl border border-border/30 bg-card p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
            <h2 className="text-xl text-foreground">What’s left</h2>
            <ul className="mt-3 space-y-1 text-sm text-foreground/80">
              <ChecklistItem done={status.hasPerson}>Basic info saved</ChecklistItem>
              <ChecklistItem done={status.hasServiceAgreementConsent}>Service agreement accepted</ChecklistItem>
              <ChecklistItem done={status.hasPrivacyAcknowledgement}>Privacy notice acknowledged</ChecklistItem>
              <ChecklistItem done={status.hasDataSharingPreference}>Sharing preference set</ChecklistItem>
              <ChecklistItem done={actor !== 'client' || hasAccountLink}>Account link (optional for assisted onboarding)</ChecklistItem>
            </ul>
          </div>
          <Separator />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">Actor:</span> {actor === 'client' ? 'Client (self)' : actor === 'staff' ? 'IHARC staff/admin' : 'Partner organization'}</p>
            {status.lastUpdatedAt ? (
              <p><span className="font-semibold text-foreground">Last updated:</span> {new Date(status.lastUpdatedAt).toLocaleString()}</p>
            ) : null}
            {nextPath ? <p><span className="font-semibold text-foreground">Next stop:</span> {nextPath}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

function BasicInfoCard({
  onSubmit,
  state,
  personId,
  prefill,
  disabled,
}: {
  onSubmit: (formData: FormData) => void;
  state: OnboardingActionState;
  personId: number | null;
  prefill: OnboardingPrefill;
  disabled?: boolean;
}) {
  const form = useForm<BasicInfoFormValues>({
    defaultValues: {
      person_id: personId ? String(personId) : '',
      chosen_name: prefill.chosenName ?? '',
      legal_name: prefill.legalName ?? '',
      pronouns: prefill.pronouns ?? '',
      postal_code: prefill.postalCode ?? '',
      contact_email: prefill.email ?? '',
      contact_phone: prefill.phone ?? '',
      preferred_contact_method: prefill.preferredContactMethod ?? 'email',
      contact_window: prefill.contactWindow ?? '',
      dob_month: prefill.dobMonth ? String(prefill.dobMonth) : '',
      dob_year: prefill.dobYear ? String(prefill.dobYear) : '',
      safe_call: prefill.safeCall,
      safe_text: prefill.safeText,
      safe_voicemail: prefill.safeVoicemail,
    },
  });

  useEffect(() => {
    form.reset({
      person_id: personId ? String(personId) : '',
      chosen_name: prefill.chosenName ?? '',
      legal_name: prefill.legalName ?? '',
      pronouns: prefill.pronouns ?? '',
      postal_code: prefill.postalCode ?? '',
      contact_email: prefill.email ?? '',
      contact_phone: prefill.phone ?? '',
      preferred_contact_method: prefill.preferredContactMethod ?? 'email',
      contact_window: prefill.contactWindow ?? '',
      dob_month: prefill.dobMonth ? String(prefill.dobMonth) : '',
      dob_year: prefill.dobYear ? String(prefill.dobYear) : '',
      safe_call: prefill.safeCall,
      safe_text: prefill.safeText,
      safe_voicemail: prefill.safeVoicemail,
    });
  }, [form, personId, prefill]);

  return (
    <Card className="border-border/40 bg-background">
      <CardHeader>
        <CardTitle className="text-xl">1. Basic info</CardTitle>
        <CardDescription>Choose the name we should use and how to reach you safely.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="person_id" value={form.watch('person_id')} />
            <fieldset disabled={disabled} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="chosen_name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="chosen_name">Name to use *</FormLabel>
                      <FormControl>
                        <Input id="chosen_name" required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legal_name"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="legal_name">Legal name (optional)</FormLabel>
                      <FormControl>
                        <Input id="legal_name" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pronouns"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="pronouns">Pronouns</FormLabel>
                      <FormControl>
                        <Input id="pronouns" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="postal_code">Postal code (optional)</FormLabel>
                      <FormControl>
                        <Input id="postal_code" autoComplete="postal-code" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="contact_email">Email</FormLabel>
                      <FormControl>
                        <Input id="contact_email" type="email" autoComplete="email" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="contact_phone">Phone</FormLabel>
                      <FormControl>
                        <Input id="contact_phone" type="tel" inputMode="tel" autoComplete="tel" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="preferred_contact_method"
                  rules={{ required: 'Choose a contact preference' }}
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="preferred_contact_method">Preferred contact</FormLabel>
                      <input type="hidden" name="preferred_contact_method" value={field.value} />
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="preferred_contact_method">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="both">Email or phone</SelectItem>
                            <SelectItem value="none">Do not contact</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_window"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="contact_window">Safe contact window (optional)</FormLabel>
                      <FormControl>
                        <Input id="contact_window" placeholder="Evenings, weekdays, etc." {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dob_month"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="dob_month">Birth month</FormLabel>
                      <FormControl>
                        <Input id="dob_month" type="number" min={1} max={12} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dob_year"
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="dob_year">Birth year</FormLabel>
                      <FormControl>
                        <Input id="dob_year" type="number" min={1900} max={new Date().getFullYear()} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <FormLabel className="text-xs text-foreground">Safe contact channels</FormLabel>
                <div className="flex flex-wrap gap-4">
                  <FormField
                    control={form.control}
                    name="safe_call"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-2">
                        <input type="hidden" name="safe_call" value={field.value ? 'on' : ''} />
                        <FormControl>
                          <Checkbox
                            id="safe_call"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          />
                        </FormControl>
                        <FormLabel htmlFor="safe_call" className="text-sm font-normal">
                          Voice calls are okay
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="safe_text"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-2">
                        <input type="hidden" name="safe_text" value={field.value ? 'on' : ''} />
                        <FormControl>
                          <Checkbox
                            id="safe_text"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          />
                        </FormControl>
                        <FormLabel htmlFor="safe_text" className="text-sm font-normal">
                          Text messages are okay
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="safe_voicemail"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-2">
                        <input type="hidden" name="safe_voicemail" value={field.value ? 'on' : ''} />
                        <FormControl>
                          <Checkbox
                            id="safe_voicemail"
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          />
                        </FormControl>
                        <FormLabel htmlFor="safe_voicemail" className="text-sm font-normal">
                          Voicemail is okay
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </fieldset>

            {state.status === 'error' ? (
              <Alert variant="destructive">
                <AlertTitle>We couldn’t save your details</AlertTitle>
                <AlertDescription>{state.message ?? 'Unable to save right now.'}</AlertDescription>
              </Alert>
            ) : null}
            {state.status === 'success' ? (
              <Alert variant="default" className="border-primary/30 bg-primary/10 text-primary">
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>Continue with consents next.</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <FormSubmit pendingLabel="Saving…" disabled={disabled}>
                {personId ? 'Save changes' : 'Save and create record'}
              </FormSubmit>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ConsentCard({
  onSubmit,
  state,
  personId,
  policies,
  disabled,
}: {
  onSubmit: (formData: FormData) => void;
  state: OnboardingActionState;
  personId: number | null;
  policies: { service: PolicyContent | null; privacy: PolicyContent | null };
  disabled?: boolean;
}) {
  const policyMissing = !policies.service || !policies.privacy;
  const form = useForm<ConsentFormValues>({
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

  return (
    <Card className="border-border/40 bg-background">
      <CardHeader>
        <CardTitle className="text-xl">2. Service agreement & privacy</CardTitle>
        <CardDescription>Review the current IHARC policies and confirm you agree.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="person_id" value={form.watch('person_id')} />
            <fieldset disabled={disabled} className="space-y-4">
              {policyMissing ? (
                <Alert variant="destructive">
                  <AlertTitle>Policy copy missing</AlertTitle>
                  <AlertDescription>
                    Ask an admin to publish the service agreement and privacy notice before continuing.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <PolicyBlock title={policies.service!.title} summary={policies.service!.shortSummary} bodyHtml={policies.service!.bodyHtml} />
                  <PolicyBlock title={policies.privacy!.title} summary={policies.privacy!.shortSummary} bodyHtml={policies.privacy!.bodyHtml} />
                </>
              )}

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="consent_service_agreement"
                  rules={{ required: true }}
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
                  rules={{ required: true }}
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

function SharingCard({
  onSubmit,
  state,
  personId,
  dataSharingConsent,
  actor,
  disabled,
}: {
  onSubmit: (formData: FormData) => void;
  state: OnboardingActionState;
  personId: number | null;
  dataSharingConsent: boolean | null;
  actor: OnboardingActor;
  disabled?: boolean;
}) {
  const partnerBlocked = actor === 'partner';
  const form = useForm<SharingFormValues>({
    defaultValues: {
      person_id: personId ? String(personId) : '',
      data_sharing: dataSharingConsent === true ? 'partners' : 'iharc_only',
    },
  });

  useEffect(() => {
    form.reset({
      person_id: personId ? String(personId) : '',
      data_sharing: dataSharingConsent === true ? 'partners' : 'iharc_only',
    });
  }, [dataSharingConsent, form, personId]);

  return (
    <Card className="border-border/40 bg-background">
      <CardHeader>
        <CardTitle className="text-xl">3. Data sharing</CardTitle>
        <CardDescription>Choose whether IHARC can share with partner organizations.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="person_id" value={form.watch('person_id')} />
            <fieldset disabled={disabled || partnerBlocked} className="space-y-3">
              <FormField
                control={form.control}
                name="data_sharing"
                rules={{ required: true }}
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <input type="hidden" name="data_sharing" value={field.value} />
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-3">
                        <label className="flex items-start gap-3 rounded-lg border border-border/40 p-3">
                          <RadioGroupItem value="iharc_only" id="data_sharing_iharc" className="mt-[4px]" />
                          <div>
                            <p className="text-sm font-medium text-foreground">IHARC only</p>
                            <p className="text-sm text-muted-foreground">
                              Only IHARC staff can view and update this record. Recommended if you are unsure.
                            </p>
                          </div>
                        </label>
                        <label className="flex items-start gap-3 rounded-lg border border-border/40 p-3">
                          <RadioGroupItem value="partners" id="data_sharing_partners" className="mt-[4px]" />
                          <div>
                            <p className="text-sm font-medium text-foreground">IHARC + partner organizations</p>
                            <p className="text-sm text-muted-foreground">
                              Trusted partner organizations can view contact info and updates to coordinate services. You can change this later.
                            </p>
                          </div>
                        </label>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>

            {partnerBlocked ? (
              <p className="text-sm text-muted-foreground">
                Partners can review onboarding but cannot change sharing preferences. Ask IHARC staff or the client to choose.
              </p>
            ) : null}

            {state.status === 'error' ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to save sharing choice</AlertTitle>
                <AlertDescription>{state.message ?? 'Please try again.'}</AlertDescription>
              </Alert>
            ) : null}
            {state.status === 'success' ? (
              <Alert variant="default" className="border-primary/30 bg-primary/10 text-primary">
                <AlertTitle>Sharing preference saved</AlertTitle>
                <AlertDescription>Your preference is recorded.</AlertDescription>
              </Alert>
            ) : null}

            <FormSubmit disabled={disabled || partnerBlocked} pendingLabel="Saving…">
              Save choice
            </FormSubmit>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function LinkCard({
  onSubmit,
  state,
  personId,
  hasAccountLink,
  actor,
  disabled,
}: {
  onSubmit: (formData: FormData) => void;
  state: OnboardingActionState;
  personId: number | null;
  hasAccountLink: boolean;
  actor: OnboardingActor;
  disabled?: boolean;
}) {
  const clientMode = actor === 'client';
  const form = useForm<LinkFormValues>({
    defaultValues: {
      person_id: personId ? String(personId) : '',
    },
  });

  useEffect(() => {
    form.setValue('person_id', personId ? String(personId) : '');
  }, [form, personId]);

  return (
    <Card className="border-border/40 bg-background">
      <CardHeader>
        <CardTitle className="text-xl">4. Account link</CardTitle>
        <CardDescription>
          Link this onboarding record to the signed-in account for future visits. Staff can skip when assisting clients.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/30 bg-muted p-4 text-sm text-muted-foreground">
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
          <form action={onSubmit} className="space-y-3">
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

function FormSubmit({
  children,
  disabled,
  pendingLabel,
}: {
  children: ReactNode;
  disabled?: boolean;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? pendingLabel ?? 'Saving…' : children}
    </Button>
  );
}

function PolicyBlock({ title, summary, bodyHtml }: { title: string; summary: string; bodyHtml: string }) {
  return (
    <div className="space-y-1 rounded-2xl border border-border/40 bg-card p-4">
      <p className="text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      <p className="text-sm text-foreground/80">{summary}</p>
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-primary">Read full text</summary>
        <div
          className="prose prose-sm mt-1 text-foreground"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </details>
    </div>
  );
}

function ChecklistItem({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-1">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${done ? 'border-primary bg-primary text-primary-foreground' : 'border-border/50 text-muted-foreground'}`}
        aria-hidden
      >
        {done ? '✓' : '•'}
      </span>
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{children}</span>
    </li>
  );
}
