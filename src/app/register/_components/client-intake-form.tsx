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
import { Textarea } from '@/components/ui/textarea';

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

type ContactChoice = 'email' | 'phone' | 'both' | 'none';

type ClientIntakeFormProps = {
  action: (state: ClientIntakeFormState, formData: FormData) => Promise<ClientIntakeFormState>;
  initialState?: ClientIntakeFormState;
  nextPath: string;
};

export function ClientIntakeForm({
  action,
  initialState = CLIENT_INTAKE_INITIAL_STATE,
  nextPath,
}: ClientIntakeFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [contactChoice, setContactChoice] = useState<ContactChoice>('email');

  const isSuccess = state.status === 'success';
  const shouldHideCredentials = contactChoice === 'none';

  useEffect(() => {
    if (isSuccess) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isSuccess]);

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
      className="space-y-space-xl rounded-2xl border border-outline/40 bg-surface p-space-lg shadow-subtle sm:p-space-xl"
      noValidate
    >
      <input type="hidden" name="next" value={nextPath} />
      <input type="hidden" name="contact_choice" value={contactChoice} />

      <section className="space-y-space-md">
        <header>
          <p className="text-label-sm uppercase text-outline">New client intake</p>
          <h1 className="text-headline-sm font-semibold text-on-surface">Tell us how to keep you safe</h1>
          <p className="mt-space-xs text-body-md text-muted-foreground">
            Every field is optional unless labelled required. Share only what feels right today — you can update details
            with your outreach team later.
          </p>
        </header>

        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>We couldn’t complete the intake</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {isSuccess ? (
          <Alert className="border-primary bg-primary-container text-on-primary-container">
            <AlertTitle>Intake received</AlertTitle>
            <AlertDescription className="space-y-space-sm">
              <p>{state.message ?? 'Thanks for sharing your details. An outreach worker will follow up shortly.'}</p>
              {state.portalCode ? (
                <p className="font-mono text-body-md">
                  Your IHARC code: <strong>{state.portalCode}</strong>. Keep this somewhere safe — you can use it later
                  to claim your online account.
                </p>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      <section className="space-y-[calc(var(--md-sys-spacing-xl)-var(--md-sys-spacing-sm))]">
        <fieldset className="space-y-space-sm rounded-xl border border-outline/30 p-space-md">
          <legend className="text-title-sm font-semibold text-on-surface">
            How should we stay in touch about your services?
          </legend>
          <RadioGroup
            value={contactChoice}
            onValueChange={(value) => setContactChoice(value as ContactChoice)}
            className="grid gap-space-sm md:grid-cols-2"
          >
            <ContactOption
              value="email"
              title="Email"
              description="We’ll send confirmations and updates to the inbox you share."
            />
            <ContactOption
              value="phone"
              title="Mobile phone"
              description="We’ll use text messages and call if it’s safe."
            />
            <ContactOption
              value="both"
              title="Both email and phone"
              description="Ideal if your phone changes often but you can access email at times."
            />
            <ContactOption
              value="none"
              title="I don’t have either right now"
              description="We’ll generate an 8-digit code you can bring to outreach or the library to finish sign-up."
            />
          </RadioGroup>
        </fieldset>

        {(contactChoice === 'email' || contactChoice === 'both') && (
          <div className="grid gap-space-xs">
            <Label htmlFor="contact_email">Email address</Label>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              autoComplete="email"
              required={contactChoice === 'email' || contactChoice === 'both'}
              placeholder="you@example.ca"
            />
          </div>
        )}

        {(contactChoice === 'phone' || contactChoice === 'both') && (
          <div className="grid gap-space-xs">
            <Label htmlFor="contact_phone">Mobile phone</Label>
            <Input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required={contactChoice === 'phone' || contactChoice === 'both'}
              placeholder="+16475551234"
            />
            <p className="text-label-sm text-muted-foreground">Include your country code so we can text verification codes if needed.</p>
          </div>
        )}

        {!shouldHideCredentials ? (
          <>
            <div className="grid gap-space-xs">
              <Label htmlFor="password">Create a password</Label>
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
            <div className="grid gap-space-xs">
              <Label htmlFor="password_confirm">Confirm password</Label>
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
          </>
        ) : null}

        <div className="grid gap-space-xs">
          <Label htmlFor="chosen_name">What name should we use with you? *</Label>
          <Input
            id="chosen_name"
            name="chosen_name"
            required
            maxLength={120}
            placeholder="Name you want IHARC to use"
          />
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="legal_name">Legal or government name (optional)</Label>
          <Input id="legal_name" name="legal_name" maxLength={160} placeholder="Only if it helps with benefits or ID" />
        </div>

        <div className="grid gap-space-xs">
          <Label htmlFor="pronouns">Pronouns (optional)</Label>
          <Input id="pronouns" name="pronouns" maxLength={80} placeholder="She/her, they/them, he/him, etc." />
        </div>

        <fieldset className="space-y-space-sm rounded-xl border border-outline/30 p-space-md">
          <legend className="text-title-sm font-semibold text-on-surface">Is it safe for us to…</legend>
          <SafetyCheckbox name="safe_call" label="Call this phone number" />
          <SafetyCheckbox name="safe_text" label="Send text messages" />
          <SafetyCheckbox name="safe_voicemail" label="Leave a voicemail if you miss our call" />

          <div className="grid gap-space-xs">
            <Label htmlFor="contact_window">Preferred contact window (optional)</Label>
            <Select name="contact_window" defaultValue="anytime">
              <SelectTrigger id="contact_window">
                <SelectValue placeholder="When should we reach out?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anytime">Anytime — reach out when you can</SelectItem>
                <SelectItem value="daytime">Daytime (9 a.m. – 5 p.m.)</SelectItem>
                <SelectItem value="evening">Evenings (5 p.m. – 9 p.m.)</SelectItem>
                <SelectItem value="weekends">Weekends only</SelectItem>
                <SelectItem value="custom">I’ll explain below</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </fieldset>

        <fieldset className="space-y-space-sm rounded-xl border border-outline/30 p-space-md">
          <legend className="text-title-sm font-semibold text-on-surface">Optional demographic details</legend>
          <p className="text-body-sm text-muted-foreground">
            These questions help IHARC report on equity outcomes. Share only what feels right — skipping them never
            impacts services.
          </p>
          <div className="grid gap-space-xs md:grid-cols-2">
            <div className="grid gap-[calc(var(--md-sys-spacing-xs)-(var(--md-sys-spacing-2xs)/2))]">
              <Label htmlFor="dob_month">Birth month</Label>
              <Select name="dob_month" defaultValue="">
                <SelectTrigger id="dob_month">
                  <SelectValue placeholder="Select month" />
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
            <div className="grid gap-[calc(var(--md-sys-spacing-xs)-(var(--md-sys-spacing-2xs)/2))]">
              <Label htmlFor="dob_year">Birth year</Label>
              <Select name="dob_year" defaultValue="">
                <SelectTrigger id="dob_year">
                  <SelectValue placeholder="Select year" />
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

          <div className="grid gap-space-xs">
            <Label htmlFor="postal_code">Postal code (if any)</Label>
            <Input
              id="postal_code"
              name="postal_code"
              maxLength={7}
              placeholder="A1A 1A1"
              autoComplete="postal-code"
            />
          </div>

          <div className="grid gap-space-xs">
            <Label htmlFor="indigenous_identity">Indigenous identity (optional)</Label>
            <Input
              id="indigenous_identity"
              name="indigenous_identity"
              maxLength={120}
              placeholder="Status / Non-status First Nation, Inuit, Métis, etc."
            />
          </div>

          <div className="grid gap-space-xs">
            <Label htmlFor="disability">Disability or accessibility notes (optional)</Label>
            <Textarea
              id="disability"
              name="disability"
              rows={3}
              placeholder="Share anything that helps us plan accommodations."
            />
          </div>

          <div className="grid gap-space-xs">
            <Label htmlFor="gender_identity">Gender identity (optional)</Label>
            <Input id="gender_identity" name="gender_identity" maxLength={120} placeholder="Self-described identity" />
          </div>
        </fieldset>

        <fieldset className="space-y-space-sm rounded-xl border border-outline/30 p-space-md">
          <legend className="text-title-sm font-semibold text-on-surface">Consent</legend>
          <ConsentCheckbox
            id="consent_privacy"
            name="consent_privacy"
            label="I understand why IHARC collects my information and how it will be used."
            required
          />
          <ConsentCheckbox
            id="consent_contact"
            name="consent_contact"
            label="I consent to IHARC contacting me about my case."
            required={!shouldHideCredentials}
          />
          <ConsentCheckbox
            id="consent_terms"
            name="consent_terms"
            label="I agree to the portal Terms and Privacy Policy."
            required
          />
          <div className="grid gap-space-xs">
            <Label htmlFor="additional_context">Anything else we should know?</Label>
            <Textarea
              id="additional_context"
              name="additional_context"
              rows={3}
              placeholder="Safety notes, accessibility needs, or anything urgent you want to flag."
            />
          </div>
        </fieldset>
      </section>

      <div className="flex items-center justify-between gap-space-md">
        <div>
          <p className="text-body-sm text-muted-foreground">
            We’ll email or text a confirmation as soon as possible. Staff can also look you up with your name and code.
          </p>
          {state.warnings?.length ? (
            <ul className="mt-space-xs space-y-space-2xs text-body-sm text-outline">
              {state.warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <SubmitButton isSuccess={isSuccess} />
      </div>
    </form>
  );
}

function ContactOption({ value, title, description }: { value: ContactChoice; title: string; description: string }) {
  return (
    <label
      htmlFor={`contact_choice_${value}`}
      className="flex cursor-pointer items-start gap-space-sm rounded-xl border border-outline/40 bg-surface-container p-space-sm text-left text-title-sm font-medium text-on-surface shadow-subtle transition state-layer-color-primary hover:border-primary hover:state-layer-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:state-layer-focus"
    >
      <RadioGroupItem id={`contact_choice_${value}`} value={value} className="mt-space-2xs" />
      <span className="text-title-sm font-medium">
        {title}
        <span className="mt-space-2xs block text-body-sm font-normal text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function SafetyCheckbox({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-start gap-space-sm text-body-md text-on-surface">
      <Checkbox id={name} name={name} className="mt-space-2xs" />
      <span>{label}</span>
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
    <label htmlFor={id} className="flex items-start gap-space-sm text-body-md text-on-surface">
      <Checkbox id={id} name={name} required={required} className="mt-space-2xs" />
      <span>
        {label} {required ? <span className="text-error">*</span> : null}
      </span>
    </label>
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
