'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFormState } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { staffLogOutreachAction, type OutreachFormState } from '@/lib/staff/actions';
import { cn } from '@/lib/utils';

type QuickOutreachFormProps = {
  personId: number | null;
  caseId: number | null;
  focusSignal?: number;
  defaultTitle?: string;
  dense?: boolean;
};

const initialState: OutreachFormState = { status: 'idle' };

function toLocalDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function QuickOutreachForm({
  personId,
  caseId,
  focusSignal,
  defaultTitle,
  dense = false,
}: QuickOutreachFormProps) {
  const [state, formAction] = useFormState(staffLogOutreachAction, initialState);
  const formRef = useRef<HTMLFormElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const occurredAtRef = useRef<HTMLInputElement | null>(null);

  const initialDateTime = useMemo(() => toLocalDateTimeValue(new Date()), []);

  useEffect(() => {
    if (focusSignal) {
      titleRef.current?.focus();
    }
  }, [focusSignal]);

  useEffect(() => {
    if (state.status === 'success') {
      formRef.current?.reset();
      const nextDefault = toLocalDateTimeValue(new Date());
      if (occurredAtRef.current) {
        occurredAtRef.current.value = nextDefault;
      }
      titleRef.current?.focus();
    }
  }, [state.status]);

  const disabled = !personId;

  return (
    <form
      ref={formRef}
      action={formAction}
      className={cn('rounded-2xl border border-outline/20 bg-surface-container p-space-md shadow-sm', dense && 'p-space-sm')}
    >
      <div className="space-y-space-sm">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="space-y-space-3xs">
            <p className="text-title-sm text-on-surface">Log outreach</p>
            <p className="text-label-sm text-muted-foreground">
              Quick entry writes to the audit trail and stays staff-only.
            </p>
          </div>
          <span className="rounded-full bg-outline/10 px-space-xs py-px text-label-sm text-muted-foreground">N</span>
        </div>

        <input type="hidden" name="person_id" value={personId ?? ''} readOnly />
        {caseId ? <input type="hidden" name="case_id" value={caseId} readOnly /> : null}

        <div className="grid gap-space-sm sm:grid-cols-2">
          <div className="space-y-space-2xs">
            <Label htmlFor="outreach-title" className="text-label-sm">
              Title
            </Label>
            <Input
              id="outreach-title"
              name="title"
              ref={titleRef}
              required
              minLength={3}
              maxLength={160}
              placeholder="Phone check-in, wellness visit, supply drop…"
              defaultValue={defaultTitle ?? ''}
              disabled={disabled}
            />
          </div>
          <div className="space-y-space-2xs">
            <Label htmlFor="outreach-occurred-at" className="text-label-sm">
              Occurred at
            </Label>
            <Input
              id="outreach-occurred-at"
              name="occurred_at"
              type="datetime-local"
              ref={occurredAtRef}
              defaultValue={initialDateTime}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-space-2xs">
          <Label htmlFor="outreach-summary" className="text-label-sm">
            Summary <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="outreach-summary"
            name="summary"
            minLength={0}
            maxLength={1200}
            rows={4}
            placeholder="What happened, supports provided, any follow-ups needed."
            disabled={disabled}
          />
        </div>

        <div className="space-y-space-2xs">
          <Label htmlFor="outreach-location" className="text-label-sm">
            Location <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="outreach-location"
            name="location"
            maxLength={240}
            placeholder="Example: Brookside shelter, phone, outreach van"
            disabled={disabled}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="space-y-space-3xs">
            <p className="text-label-sm text-muted-foreground">
              Select a case to enable logging. Entries respect Supabase RLS.
            </p>
            <p className="text-label-sm text-muted-foreground">
              Audit trail captures actor, time, and linked person.
            </p>
          </div>
          <Button type="submit" disabled={disabled}>
            Save outreach
          </Button>
        </div>

        <p aria-live="polite" className={cn('text-label-sm', state.status === 'error' ? 'text-destructive' : 'text-primary')}>
          {state.status === 'success' ? state.message : null}
          {state.status === 'error' ? state.message : null}
        </p>
      </div>
    </form>
  );
}
