'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ClientClaimFormState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
  portalCode?: string | null;
};

export const CLIENT_CLAIM_INITIAL_STATE: ClientClaimFormState = {
  status: 'idle',
};

type ContactMethod = 'email' | 'phone';

type ClientClaimFormProps = {
  action: (state: ClientClaimFormState, formData: FormData) => Promise<ClientClaimFormState>;
  initialState?: ClientClaimFormState;
  nextPath: string;
};

export function ClientClaimForm({
  action,
  initialState = CLIENT_CLAIM_INITIAL_STATE,
  nextPath,
}: ClientClaimFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [contactMethod, setContactMethod] = useState<ContactMethod>('email');
  const form = useForm({
    defaultValues: {
      next: nextPath,
      contact_method: contactMethod,
      portal_code: '',
      chosen_name: '',
      dob_month: '',
      dob_year: '',
      contact_email: '',
      contact_phone: '',
      safe_call: false,
      safe_text: false,
      password: '',
      password_confirm: '',
      consent_privacy: false,
      consent_contact: false,
      consent_terms: false,
    },
  });

  const isSuccess = state.status === 'success';

  useEffect(() => {
    if (state.error || isSuccess) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [state.error, isSuccess]);

  const dobYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear; year >= currentYear - 100; year -= 1) {
      years.push(year);
    }
    return years;
  }, []);

  return (
    <Form {...form}>
      <form
        action={formAction}
        className="space-y-8 rounded-2xl border border-border/40 bg-background p-6 shadow-sm sm:p-8"
        noValidate
      >
        <input type="hidden" {...form.register('next')} />
        <input type="hidden" {...form.register('contact_method')} value={contactMethod} />

      <section className="space-y-4">
        <header>
          <p className="text-xs uppercase text-muted-foreground">Link existing services</p>
          <h1 className="text-2xl font-semibold text-foreground">Claim your IHARC record</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Share at least two pieces of information. We cross-check them securely so your record never gets duplicated.
          </p>
        </header>

        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>We couldn’t link your record</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {isSuccess && state.message ? (
          <Alert className="border-primary bg-primary/10 text-primary">
            <AlertTitle>Record linked</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
      </section>

        <section className="space-y-5">
          <FormField
            control={form.control}
            name="portal_code"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="portal_code">IHARC ID or intake code (optional)</FormLabel>
                <FormControl>
                  <Input
                    id="portal_code"
                    maxLength={12}
                    placeholder="1234-5678"
                    autoComplete="one-time-code"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  This 8-digit code appears on your intake paperwork. If you do not have it, share two other details below.
                </p>
              </FormItem>
            )}
          />

          <fieldset className="grid gap-3 rounded-xl border border-border/30 p-4">
            <legend className="text-sm font-semibold text-foreground">Who are we linking?</legend>
            <FormField
              control={form.control}
              name="chosen_name"
              rules={{ required: 'Provide your preferred name' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="chosen_name">Chosen or preferred name *</FormLabel>
                  <FormControl>
                    <Input
                      id="chosen_name"
                      required
                      maxLength={120}
                      placeholder="Name your outreach worker knows you by"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-1.5">
              <FormLabel htmlFor="dob_month">Birth month *</FormLabel>
              <Select
                value={form.watch('dob_month')}
                onValueChange={(value) => form.setValue('dob_month', value)}
              >
                <SelectTrigger id="dob_month">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Prefer not to say</SelectItem>
                  {MONTHS.map(({ value, label }) => (
                    <SelectItem key={value} value={String(value)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <FormLabel htmlFor="dob_year">Birth year *</FormLabel>
              <Select value={form.watch('dob_year')} onValueChange={(value) => form.setValue('dob_year', value)}>
                <SelectTrigger id="dob_year">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="">Prefer not to say</SelectItem>
                  {dobYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-border/30 p-4">
          <legend className="text-sm font-semibold text-foreground">
            Where should we send login confirmations?
          </legend>
          <RadioGroup
            value={contactMethod}
            onValueChange={(value) => {
              setContactMethod(value as ContactMethod);
              form.setValue('contact_method', value);
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <ContactMethodOption
              value="email"
              title="Email"
              description="We’ll send a confirmation link to your inbox and store your code."
            />
            <ContactMethodOption
              value="phone"
              title="Mobile phone"
              description="We’ll text a verification link. Only use this on a phone you control."
            />
          </RadioGroup>
          <input type="hidden" {...form.register('dob_month')} value={form.watch('dob_month')} />
          <input type="hidden" {...form.register('dob_year')} value={form.watch('dob_year')} />

          {contactMethod === 'email' ? (
            <FormField
              control={form.control}
              name="contact_email"
              rules={{ required: 'Email is required' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="contact_email">Email address *</FormLabel>
                  <FormControl>
                    <Input
                      id="contact_email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.ca"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="contact_phone"
              rules={{ required: 'Phone is required' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="contact_phone">Mobile phone *</FormLabel>
                  <FormControl>
                    <Input
                      id="contact_phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      required
                      placeholder="+16475551234"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Include the country code. We will text a verification link and never leave voicemail without consent.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </fieldset>

        <div className="grid gap-2 md:grid-cols-2">
          <FormField
            control={form.control}
            name="safe_call"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="safe_call_claim" className="text-sm font-medium text-foreground">
                  Is it safe to call this number?
                </FormLabel>
                <input type="hidden" name="safe_call" value={field.value ? 'on' : ''} />
                <FormControl>
                  <Checkbox
                    id="safe_call_claim"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    className="mt-1"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="safe_text"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="safe_text_claim" className="text-sm font-medium text-foreground">
                  Is it safe to send text messages?
                </FormLabel>
                <input type="hidden" name="safe_text" value={field.value ? 'on' : ''} />
                <FormControl>
                  <Checkbox
                    id="safe_text_claim"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    className="mt-1"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="password"
          rules={{ required: 'Create a password' }}
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel htmlFor="password">Create a password *</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  placeholder="At least 12 characters"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password_confirm"
          rules={{ required: 'Confirm password' }}
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel htmlFor="password_confirm">Confirm password *</FormLabel>
              <FormControl>
                <Input
                  id="password_confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  placeholder="Re-enter your password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="space-y-3 rounded-xl border border-border/30 p-4">
          <legend className="text-sm font-semibold text-foreground">Consent</legend>
          <FormField
            control={form.control}
            name="consent_privacy"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 text-sm text-foreground">
                <input type="hidden" name="consent_privacy" value={field.value ? 'on' : ''} />
                <FormControl>
                  <Checkbox
                    id="consent_privacy_claim"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    className="mt-1"
                  />
                </FormControl>
                <FormLabel htmlFor="consent_privacy_claim" className="font-normal">
                  I understand why IHARC collects my information and how it’s used. <span className="text-destructive">*</span>
                </FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="consent_contact"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 text-sm text-foreground">
                <input type="hidden" name="consent_contact" value={field.value ? 'on' : ''} />
                <FormControl>
                  <Checkbox
                    id="consent_contact_claim"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    className="mt-1"
                  />
                </FormControl>
                <FormLabel htmlFor="consent_contact_claim" className="font-normal">
                  It is safe for IHARC to contact me about my case. <span className="text-destructive">*</span>
                </FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="consent_terms"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 text-sm text-foreground">
                <input type="hidden" name="consent_terms" value={field.value ? 'on' : ''} />
                <FormControl>
                  <Checkbox
                    id="consent_terms_claim"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    className="mt-1"
                  />
                </FormControl>
                <FormLabel htmlFor="consent_terms_claim" className="font-normal">
                  I agree to the portal Terms and Privacy Policy. <span className="text-destructive">*</span>
                </FormLabel>
              </FormItem>
            )}
          />
        </fieldset>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Staff will review matches before sensitive records unlock. You’ll see confirmation on screen and by email/text.
        </p>
        <SubmitButton isSuccess={isSuccess} />
      </div>
    </form>
  );
}

function ContactMethodOption({
  value,
  title,
  description,
}: {
  value: ContactMethod;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={`contact_method_${value}`}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-card p-3 text-left text-sm font-medium text-foreground shadow-sm transition hover:border-primary/60 hover:bg-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background"
    >
      <RadioGroupItem id={`contact_method_${value}`} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function SubmitButton({ isSuccess }: { isSuccess: boolean }) {
  const { pending } = useFormStatus();
  const label = isSuccess ? 'Record linked' : 'Claim my record';

  return (
    <Button type="submit" disabled={pending || isSuccess} className="min-w-[160px] justify-center">
      {pending ? 'Linking...' : label}
    </Button>
  );
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];
