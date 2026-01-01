'use client';

import { useActionState } from 'react';
import { Button } from '@shared/ui/button';
import { Label } from '@shared/ui/label';
import { adminRenewConsentAction, adminRevokeConsentAction } from '@/lib/cases/actions';
import type { ActionState } from '@/lib/server-actions/validate';

type AdminConsentActionsProps = {
  personId: number;
  consentId: string;
};

type ConsentActionState = ActionState<{ message?: string }>;

const initialState: ConsentActionState = { status: 'idle' };

export function AdminConsentActions({ personId, consentId }: AdminConsentActionsProps) {
  const [renewState, renewAction] = useActionState(
    (_prev: ConsentActionState, formData: FormData) => adminRenewConsentAction(formData),
    initialState,
  );
  const [revokeState, revokeAction] = useActionState(
    (_prev: ConsentActionState, formData: FormData) => adminRevokeConsentAction(formData),
    initialState,
  );
  const renewResolved = 'status' in renewState ? null : renewState;
  const revokeResolved = 'status' in revokeState ? null : revokeState;
  const renewError = renewResolved && !renewResolved.ok ? renewResolved.error : null;
  const renewSuccess = renewResolved && renewResolved.ok ? renewResolved.data?.message : null;
  const revokeError = revokeResolved && !revokeResolved.ok ? revokeResolved.error : null;
  const revokeSuccess = revokeResolved && revokeResolved.ok ? revokeResolved.data?.message : null;

  return (
    <div className="grid gap-2">
      <form action={renewAction} className="space-y-2">
        <input type="hidden" name="person_id" value={personId} />
        <input type="hidden" name="consent_id" value={consentId} />
        <div className="space-y-1">
          <Label htmlFor={`renew_method_${personId}`} className="text-xs">
            Consent method
          </Label>
          <select
            id={`renew_method_${personId}`}
            name="consent_method"
            defaultValue="verbal"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="verbal">Verbal</option>
            <option value="documented">Documented</option>
            <option value="staff_assisted">Staff assisted</option>
          </select>
        </div>
        <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/30 p-3 text-xs text-foreground">
          <p className="font-semibold">Required attestations</p>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="attested_by_staff" required className="mt-1 h-4 w-4" />
            <span>I confirm the client was present and consent was explained in plain language.</span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" name="attested_by_client" required className="mt-1 h-4 w-4" />
            <span>The client confirms they understand and agree to these sharing selections.</span>
          </label>
        </div>
        <Button type="submit" variant="outline" className="w-full">
          Renew consent
        </Button>
        {renewError ? <p className="text-xs text-destructive">{renewError}</p> : null}
        {renewSuccess ? <p className="text-xs text-emerald-600">{renewSuccess}</p> : null}
      </form>
      <form action={revokeAction} className="space-y-2">
        <input type="hidden" name="person_id" value={personId} />
        <input type="hidden" name="consent_id" value={consentId} />
        <Button type="submit" variant="destructive" className="w-full">
          Revoke consent
        </Button>
        {revokeError ? <p className="text-xs text-destructive">{revokeError}</p> : null}
        {revokeSuccess ? <p className="text-xs text-emerald-600">{revokeSuccess}</p> : null}
      </form>
    </div>
  );
}
