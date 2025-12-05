'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <form
      action={formAction}
      className="space-y-8 rounded-2xl border border-border/40 bg-background p-6 shadow-sm sm:p-8"
      noValidate
    >
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="contact_method" value={contactMethod} />

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
        <div className="grid gap-2">
          <Label htmlFor="portal_code">IHARC ID or intake code (optional)</Label>
          <Input
            id="portal_code"
            name="portal_code"
            maxLength={12}
            placeholder="1234-5678"
            autoComplete="one-time-code"
          />
          <p className="text-xs text-muted-foreground">
            This 8-digit code appears on your intake paperwork. If you do not have it, share two other details below.
          </p>
        </div>

        <fieldset className="grid gap-3 rounded-xl border border-border/30 p-4">
          <legend className="text-sm font-semibold text-foreground">Who are we linking?</legend>
          <div className="grid gap-2">
            <Label htmlFor="chosen_name">Chosen or preferred name *</Label>
            <Input
              id="chosen_name"
              name="chosen_name"
              required
              maxLength={120}
              placeholder="Name your outreach worker knows you by"
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="dob_month">Birth month *</Label>
              <Select name="dob_month" defaultValue="">
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
              <Label htmlFor="dob_year">Birth year *</Label>
              <Select name="dob_year" defaultValue="">
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
            onValueChange={(value) => setContactMethod(value as ContactMethod)}
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

          {contactMethod === 'email' ? (
            <div className="grid gap-2">
              <Label htmlFor="contact_email">Email address *</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.ca"
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="contact_phone">Mobile phone *</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                placeholder="+16475551234"
              />
              <p className="text-xs text-muted-foreground">
                Include the country code. We will text a verification link and never leave voicemail without consent.
              </p>
            </div>
          )}
        </fieldset>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="safe_call_claim" className="text-sm font-medium text-foreground">
              Is it safe to call this number?
            </Label>
            <Checkbox id="safe_call_claim" name="safe_call" className="mt-1" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="safe_text_claim" className="text-sm font-medium text-foreground">
              Is it safe to send text messages?
            </Label>
            <Checkbox id="safe_text_claim" name="safe_text" className="mt-1" />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password">Create a password *</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            placeholder="At least 12 characters"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password_confirm">Confirm password *</Label>
          <Input
            id="password_confirm"
            name="password_confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            placeholder="Re-enter your password"
          />
        </div>

        <fieldset className="space-y-3 rounded-xl border border-border/30 p-4">
          <legend className="text-sm font-semibold text-foreground">Consent</legend>
          <ConsentCheckbox
            id="consent_privacy_claim"
            name="consent_privacy"
            label="I understand why IHARC collects my information and how it’s used."
            required
          />
          <ConsentCheckbox
            id="consent_contact_claim"
            name="consent_contact"
            label="It is safe for IHARC to contact me about my case."
            required
          />
          <ConsentCheckbox
            id="consent_terms_claim"
            name="consent_terms"
            label="I agree to the portal Terms and Privacy Policy."
            required
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

function ConsentCheckbox({
  id,
  name,
  label,
  required = false,
}: {
  id: string;
  name: string;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm text-foreground">
      <Checkbox id={id} name={name} required={required} className="mt-1" />
      <span>
        {label} {required ? <span className="text-destructive">*</span> : null}
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
