'use client';

import { useEffect, useMemo } from 'react';
import { useFormState } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { staffLogOutreachAction, type OutreachFormState } from '@/lib/staff/actions';
import { cn } from '@/lib/utils';

type QuickOutreachFormProps = {
  personId: number | null;
  caseId: number | null;
  focusSignal?: number;
  defaultTitle?: string;
  dense?: boolean;
};

type OutreachFormValues = {
  person_id: string;
  case_id?: string;
  title: string;
  occurred_at: string;
  summary: string;
  location: string;
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
  const initialDateTime = useMemo(() => toLocalDateTimeValue(new Date()), []);
  const form = useForm<OutreachFormValues>({
    defaultValues: {
      person_id: personId ? String(personId) : '',
      case_id: caseId ? String(caseId) : undefined,
      title: defaultTitle ?? '',
      occurred_at: initialDateTime,
      summary: '',
      location: '',
    },
  });

  useEffect(() => {
    if (focusSignal) {
      form.setFocus('title');
    }
  }, [focusSignal, form]);

  useEffect(() => {
    form.reset({
      person_id: personId ? String(personId) : '',
      case_id: caseId ? String(caseId) : undefined,
      title: defaultTitle ?? '',
      occurred_at: toLocalDateTimeValue(new Date()),
      summary: '',
      location: '',
    });
  }, [caseId, defaultTitle, form, personId, state.status]);

  const disabled = !personId;

  return (
    <Form {...form}>
      <form
        action={formAction}
        className={cn('rounded-2xl border border-border/40 bg-card p-4 shadow-sm', dense && 'p-3')}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-base text-foreground">Log outreach</p>
              <p className="text-xs text-muted-foreground">
                Quick entry writes to the audit trail and stays staff-only.
              </p>
            </div>
            <span className="rounded-full bg-border/10 px-2 py-px text-xs text-muted-foreground">N</span>
          </div>

          <input type="hidden" {...form.register('person_id')} readOnly />
          {caseId ? <input type="hidden" {...form.register('case_id')} readOnly /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              rules={{ required: 'Add a title' }}
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel htmlFor="outreach-title" className="text-xs">
                    Title
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="outreach-title"
                      required
                      minLength={3}
                      maxLength={160}
                      placeholder="Phone check-in, wellness visit, supply drop…"
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="occurred_at"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel htmlFor="outreach-occurred-at" className="text-xs">
                    Occurred at
                  </FormLabel>
                  <FormControl>
                    <Input
                      id="outreach-occurred-at"
                      type="datetime-local"
                      disabled={disabled}
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="summary"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel htmlFor="outreach-summary" className="text-xs">
                  Summary <span className="text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    id="outreach-summary"
                    minLength={0}
                    maxLength={1200}
                    rows={4}
                    placeholder="What happened, supports provided, any follow-ups needed."
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormLabel htmlFor="outreach-location" className="text-xs">
                  Location <span className="text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    id="outreach-location"
                    maxLength={240}
                    placeholder="Example: Brookside shelter, phone, outreach van"
                    disabled={disabled}
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">
                Select a case to enable logging. Entries respect Supabase RLS.
              </p>
              <p className="text-xs text-muted-foreground">
                Audit trail captures actor, time, and linked person.
              </p>
            </div>
            <Button type="submit" disabled={disabled}>
              Save outreach
            </Button>
          </div>

          <p aria-live="polite" className={cn('text-xs', state.status === 'error' ? 'text-destructive' : 'text-primary')}>
            {state.status === 'success' ? state.message : null}
            {state.status === 'error' ? state.message : null}
          </p>
        </div>
      </form>
    </Form>
  );
}
