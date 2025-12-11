'use client';

import type { ReactNode } from 'react';
import { Separator } from '@shared/ui/separator';
import type { OnboardingStatus } from '@/lib/onboarding/status';
import type { OnboardingActor } from '@/lib/onboarding/utils';

export function OnboardingAside({ status, actor, hasAccountLink, nextPath }: { status: OnboardingStatus; actor: OnboardingActor; hasAccountLink: boolean; nextPath?: string | null }) {
  return (
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
        <p>
          <span className="font-semibold text-foreground">Actor:</span> {actor === 'client' ? 'Client (self)' : actor === 'staff' ? 'IHARC staff/admin' : 'Partner organization'}
        </p>
        {status.lastUpdatedAt ? (
          <p>
            <span className="font-semibold text-foreground">Last updated:</span> {new Date(status.lastUpdatedAt).toLocaleString()}
          </p>
        ) : null}
        {nextPath ? (
          <p>
            <span className="font-semibold text-foreground">Next stop:</span> {nextPath}
          </p>
        ) : null}
      </div>
    </aside>
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
