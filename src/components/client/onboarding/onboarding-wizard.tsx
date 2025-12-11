'use client';

/* eslint-disable react-hooks/incompatible-library */

import { useEffect, useMemo } from 'react';
import { useFormState } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Badge } from '@shared/ui/badge';
import { Button } from '@shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { Progress } from '@shared/ui/progress';
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
import { BasicInfoCard } from './sections/BasicInfoCard';
import { ConsentCard } from './sections/ConsentCard';
import { SharingCard } from './sections/SharingCard';
import { LinkCard } from './sections/LinkCard';
import { OnboardingAside } from './sections/OnboardingAside';
import type { OnboardingPrefill, PolicyContent } from './types';
export type { OnboardingPrefill, PolicyContent } from './types';

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

type WizardStep = { id: string; label: string; state: StepState; description: string };

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
    const checks = [status.hasPerson, status.hasServiceAgreementConsent && status.hasPrivacyAcknowledgement, status.hasDataSharingPreference];
    return checks.filter(Boolean).length;
  }, [status]);

  const progressValue = Math.round((completionCount / 3) * 100);
  const blocked = Boolean(partnerBlockedReason);

  const steps: WizardStep[] = [
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
          <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1 text-sm text-destructive">{partnerBlockedReason}</p>
        ) : null}
      </header>

      {status.status === 'COMPLETED' ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl">Onboarding complete</CardTitle>
            <CardDescription>Thanks for confirming. You can continue to the portal — your preferences are saved.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => router.replace(nextPath && nextPath.startsWith('/') ? nextPath : '/home')}>Go to portal</Button>
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
          <BasicInfoCard onSubmit={basicAction} state={basicState} personId={personId} prefill={prefill} disabled={blocked} />
          <ConsentCard onSubmit={consentAction} state={consentState} personId={personId} policies={policies} disabled={!personId || blocked} />
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

        <OnboardingAside status={status} actor={actor} hasAccountLink={hasAccountLink} nextPath={nextPath} />
      </div>
    </div>
  );
}
