'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  INITIAL_ONBOARDING_ACTION_STATE,
  linkAccountToPersonAction,
  recordConsentsAction,
  saveBasicInfoAction,
  saveSharingPreferenceAction,
  type OnboardingActionState,
} from '@/app/(portal)/onboarding/actions';
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
    <div className="space-y-space-lg">
      <header className="rounded-3xl border border-outline/12 bg-surface p-space-lg shadow-level-2">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div>
            <span className="inline-flex items-center gap-space-2xs rounded-full border border-primary/25 bg-primary/10 px-space-sm py-space-3xs text-label-sm font-semibold uppercase tracking-label-uppercase text-primary">
              Onboarding
            </span>
            <h1 className="mt-space-xs text-headline-lg font-semibold text-on-surface sm:text-display-sm">Finish onboarding to use STEVI</h1>
            <p className="max-w-3xl text-body-md text-muted-foreground">
              We need consent and a sharing choice before unlocking appointments, documents, and cases. You can pause and resume at any time.
            </p>
          </div>
          <div className="flex items-center gap-space-sm">
            <Badge variant={status.status === 'COMPLETED' ? 'default' : 'secondary'}>
              {status.status === 'COMPLETED' ? 'Completed' : 'In progress'}
            </Badge>
          </div>
        </div>
        <div className="mt-space-md space-y-space-2xs">
          <div className="flex items-center justify-between text-label-sm text-muted-foreground">
            <span>{completionCount}/3 required steps</span>
            <span>{progressValue}%</span>
          </div>
          <Progress value={progressValue} />
        </div>
        <div className="mt-space-md flex flex-wrap gap-space-sm">
          {steps.map((step) => (
            <Badge
              key={step.id}
              variant={step.state === 'done' ? 'default' : step.state === 'ready' ? 'outline' : 'secondary'}
              className="flex items-center gap-space-2xs"
            >
              {step.label}
              <span className="text-muted-foreground">· {step.state === 'done' ? 'Done' : step.state === 'ready' ? 'Ready' : 'Pending'}</span>
            </Badge>
          ))}
        </div>
        {actor === 'client' && !personId ? (
          <p className="mt-space-sm rounded-lg border border-outline/40 bg-surface-container-low px-space-sm py-space-2xs text-body-sm text-on-surface">
            We need to connect your login to an IHARC record before continuing. Please contact support if you were invited but do not see your record.
          </p>
        ) : null}
        {blocked ? (
          <p className="mt-space-sm rounded-lg border border-destructive/30 bg-destructive/10 px-space-sm py-space-2xs text-body-sm text-destructive">
            {partnerBlockedReason}
          </p>
        ) : null}
      </header>

      {status.status === 'COMPLETED' ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-title-lg">Onboarding complete</CardTitle>
            <CardDescription>
              Thanks for confirming. You can continue to the portal — your preferences are saved.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-space-sm">
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

      <div className="grid gap-space-lg lg:grid-cols-[2fr,1fr]">
        <div className="space-y-space-lg">
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

        <aside className="space-y-space-md rounded-3xl border border-outline/12 bg-surface-container-high p-space-lg shadow-level-1">
          <div>
            <p className="text-label-sm font-semibold uppercase text-muted-foreground">Status</p>
            <h2 className="text-title-lg text-on-surface">What’s left</h2>
            <ul className="mt-space-sm space-y-space-2xs text-body-sm text-on-surface/80">
              <ChecklistItem done={status.hasPerson}>Basic info saved</ChecklistItem>
              <ChecklistItem done={status.hasServiceAgreementConsent}>Service agreement accepted</ChecklistItem>
              <ChecklistItem done={status.hasPrivacyAcknowledgement}>Privacy notice acknowledged</ChecklistItem>
              <ChecklistItem done={status.hasDataSharingPreference}>Sharing preference set</ChecklistItem>
              <ChecklistItem done={actor !== 'client' || hasAccountLink}>Account link (optional for assisted onboarding)</ChecklistItem>
            </ul>
          </div>
          <Separator />
          <div className="space-y-space-2xs text-body-sm text-muted-foreground">
            <p><span className="font-semibold text-on-surface">Actor:</span> {actor === 'client' ? 'Client (self)' : actor === 'staff' ? 'IHARC staff/admin' : 'Partner organization'}</p>
            {status.lastUpdatedAt ? (
              <p><span className="font-semibold text-on-surface">Last updated:</span> {new Date(status.lastUpdatedAt).toLocaleString()}</p>
            ) : null}
            {nextPath ? <p><span className="font-semibold text-on-surface">Next stop:</span> {nextPath}</p> : null}
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
  return (
    <Card className="border-outline/16 bg-surface">
      <CardHeader>
        <CardTitle className="text-title-lg">1. Basic info</CardTitle>
        <CardDescription>Choose the name we should use and how to reach you safely.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-space-md">
          <input type="hidden" name="person_id" value={personId ?? ''} />
          <fieldset disabled={disabled} className="space-y-space-md">
            <div className="grid gap-space-sm md:grid-cols-2">
              <Field label="Name to use" name="chosen_name" defaultValue={prefill.chosenName} required />
              <Field label="Legal name (optional)" name="legal_name" defaultValue={prefill.legalName ?? ''} />
              <Field label="Pronouns" name="pronouns" defaultValue={prefill.pronouns ?? ''} />
              <Field label="Postal code (optional)" name="postal_code" defaultValue={prefill.postalCode ?? ''} />
            </div>

            <div className="grid gap-space-sm md:grid-cols-2">
              <Field label="Email" name="contact_email" type="email" defaultValue={prefill.email ?? ''} />
              <Field label="Phone" name="contact_phone" defaultValue={prefill.phone ?? ''} />
            </div>

            <div className="grid gap-space-sm md:grid-cols-2">
              <div className="space-y-space-2xs">
                <Label className="text-label-sm text-on-surface">Preferred contact</Label>
                <select
                  name="preferred_contact_method"
                  defaultValue={prefill.preferredContactMethod ?? 'email'}
                  className="w-full rounded-md border border-outline/40 bg-surface px-space-sm py-space-2xs text-body-sm"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="both">Email or phone</option>
                  <option value="none">Do not contact</option>
                </select>
              </div>
              <Field label="Safe contact window (optional)" name="contact_window" defaultValue={prefill.contactWindow ?? ''} />
            </div>

            <div className="grid gap-space-sm md:grid-cols-2">
              <div className="space-y-space-2xs">
                <Label className="text-label-sm text-on-surface">Birth month</Label>
                <Input name="dob_month" type="number" min={1} max={12} defaultValue={prefill.dobMonth ?? ''} />
              </div>
              <div className="space-y-space-2xs">
                <Label className="text-label-sm text-on-surface">Birth year</Label>
                <Input name="dob_year" type="number" min={1900} max={new Date().getFullYear()} defaultValue={prefill.dobYear ?? ''} />
              </div>
            </div>

            <div className="space-y-space-2xs">
              <Label className="text-label-sm text-on-surface">Safe contact channels</Label>
              <div className="flex flex-wrap gap-space-md">
                <CheckboxField id="safe_call" label="Voice calls are okay" defaultChecked={prefill.safeCall} />
                <CheckboxField id="safe_text" label="Text messages are okay" defaultChecked={prefill.safeText} />
                <CheckboxField id="safe_voicemail" label="Voicemail is okay" defaultChecked={prefill.safeVoicemail} />
              </div>
            </div>
          </fieldset>

          {state.status === 'error' ? <ErrorMessage message={state.message ?? 'Unable to save right now.'} /> : null}
          {state.status === 'success' ? <SuccessMessage message="Saved. Continue with consents next." /> : null}

          <div className="flex flex-wrap gap-space-sm">
            <FormSubmit pendingLabel="Saving…" disabled={disabled}>
              {personId ? 'Save changes' : 'Save and create record'}
            </FormSubmit>
          </div>
        </form>
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

  return (
    <Card className="border-outline/16 bg-surface">
      <CardHeader>
        <CardTitle className="text-title-lg">2. Service agreement & privacy</CardTitle>
        <CardDescription>Review the current IHARC policies and confirm you agree.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-space-md">
          <input type="hidden" name="person_id" value={personId ?? ''} />
          <fieldset disabled={disabled} className="space-y-space-md">
            {policyMissing ? (
              <p className="text-body-sm text-destructive">
                Policy copy is missing — ask an admin to publish the service agreement and privacy notice.
              </p>
            ) : (
              <>
                <PolicyBlock title={policies.service!.title} summary={policies.service!.shortSummary} bodyHtml={policies.service!.bodyHtml} />
                <PolicyBlock title={policies.privacy!.title} summary={policies.privacy!.shortSummary} bodyHtml={policies.privacy!.bodyHtml} />
              </>
            )}

            <div className="space-y-space-sm">
              <CheckboxField id="consent_service_agreement" label="I agree to the Client Service Agreement." required />
              <CheckboxField id="consent_privacy" label="I acknowledge the Privacy & Data Protection Notice." required />
            </div>
          </fieldset>

          {state.status === 'error' ? <ErrorMessage message={state.message ?? 'Unable to save consent.'} /> : null}
          {state.status === 'success' ? <SuccessMessage message="Consent recorded." /> : null}

          <FormSubmit disabled={disabled || policyMissing} pendingLabel="Recording…">
            Record consent
          </FormSubmit>
        </form>
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

  return (
    <Card className="border-outline/16 bg-surface">
      <CardHeader>
        <CardTitle className="text-title-lg">3. Data sharing</CardTitle>
        <CardDescription>Choose whether IHARC can share with partner organizations.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-space-md">
          <input type="hidden" name="person_id" value={personId ?? ''} />
          <fieldset disabled={disabled || partnerBlocked} className="space-y-space-sm">
            <label className="flex items-start gap-space-sm rounded-lg border border-outline/40 p-space-sm">
              <input
                type="radio"
                name="data_sharing"
                value="iharc_only"
                defaultChecked={dataSharingConsent !== true}
                className="mt-[4px] h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-body-md font-medium text-on-surface">IHARC only</p>
                <p className="text-body-sm text-muted-foreground">
                  Only IHARC staff can view and update this record. Recommended if you are unsure.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-space-sm rounded-lg border border-outline/40 p-space-sm">
              <input
                type="radio"
                name="data_sharing"
                value="partners"
                defaultChecked={dataSharingConsent === true}
                className="mt-[4px] h-4 w-4 accent-primary"
              />
              <div>
                <p className="text-body-md font-medium text-on-surface">IHARC + partner organizations</p>
                <p className="text-body-sm text-muted-foreground">
                  Trusted partner organizations can view contact info and updates to coordinate services. You can change this later with IHARC.
                </p>
              </div>
            </label>
          </fieldset>

          {partnerBlocked ? (
            <p className="text-body-sm text-muted-foreground">
              Partners can review onboarding but cannot change sharing preferences. Ask IHARC staff or the client to choose.
            </p>
          ) : null}

          {state.status === 'error' ? <ErrorMessage message={state.message ?? 'Unable to save sharing preference.'} /> : null}
          {state.status === 'success' ? <SuccessMessage message="Sharing preference saved." /> : null}

          <FormSubmit disabled={disabled || partnerBlocked} pendingLabel="Saving…">
            Save choice
          </FormSubmit>
        </form>
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

  return (
    <Card className="border-outline/16 bg-surface">
      <CardHeader>
        <CardTitle className="text-title-lg">4. Account link</CardTitle>
        <CardDescription>
          Link this onboarding record to the signed-in account for future visits. Staff can skip when assisting clients.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-space-md">
        <div className="rounded-lg border border-outline/30 bg-surface-container-low p-space-md text-body-sm text-muted-foreground">
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

        <form action={onSubmit} className="space-y-space-sm">
          <input type="hidden" name="person_id" value={personId ?? ''} />
          {state.status === 'error' ? <ErrorMessage message={state.message ?? 'Unable to link right now.'} /> : null}
          {state.status === 'success' ? <SuccessMessage message="Account linked." /> : null}
          <FormSubmit disabled={disabled || !clientMode || hasAccountLink} pendingLabel="Linking…">
            {hasAccountLink ? 'Account linked' : 'Link my account'}
          </FormSubmit>
        </form>
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

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
}) {
  return (
    <div className="space-y-space-2xs">
      <Label htmlFor={name} className="text-label-sm text-on-surface">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}

function CheckboxField({
  id,
  label,
  defaultChecked,
  required,
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-space-sm text-body-sm text-on-surface">
      <Checkbox id={id} name={id} defaultChecked={defaultChecked} required={required} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}

function PolicyBlock({ title, summary, bodyHtml }: { title: string; summary: string; bodyHtml: string }) {
  return (
    <div className="space-y-space-2xs rounded-2xl border border-outline/16 bg-surface-container-high p-space-md">
      <p className="text-label-sm font-semibold uppercase text-muted-foreground">{title}</p>
      <p className="text-body-sm text-on-surface/80">{summary}</p>
      <details className="group">
        <summary className="cursor-pointer text-body-sm font-medium text-primary">Read full text</summary>
        <div
          className="prose prose-sm mt-space-2xs text-on-surface"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </details>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-space-sm py-space-2xs text-body-sm text-destructive">{message}</p>;
}

function SuccessMessage({ message }: { message: string }) {
  return <p className="rounded-xl border border-primary/25 bg-primary/10 px-space-sm py-space-2xs text-body-sm text-primary">{message}</p>;
}

function ChecklistItem({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-space-2xs">
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${done ? 'border-primary bg-primary text-on-primary' : 'border-outline/50 text-muted-foreground'}`}
        aria-hidden
      >
        {done ? '✓' : '•'}
      </span>
      <span className={done ? 'text-on-surface' : 'text-muted-foreground'}>{children}</span>
    </li>
  );
}
