'use client';

/* eslint-disable react-hooks/incompatible-library */

import { useActionState, useEffect, useMemo } from 'react';
import type { FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Checkbox } from '@shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shared/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';

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

type ClientIntakeFormValues = {
  next: string;
  contact_choice: ContactChoice;
  contact_email: string;
  contact_phone: string;
  password: string;
  password_confirm: string;
  chosen_name: string;
  legal_name: string;
  pronouns: string;
  safe_call: boolean;
  safe_text: boolean;
  safe_voicemail: boolean;
  contact_window: string;
  dob_month: string;
  dob_year: string;
  postal_code: string;
  indigenous_identity: string;
  disability: string;
  gender_identity: string;
  consent_privacy: boolean;
  consent_contact: boolean;
  consent_terms: boolean;
  additional_context: string;
};

export function ClientIntakeForm({
  action,
  initialState = CLIENT_INTAKE_INITIAL_STATE,
  nextPath,
}: ClientIntakeFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<ClientIntakeFormValues>({
    defaultValues: {
      next: nextPath,
      contact_choice: 'email',
      contact_email: '',
      contact_phone: '',
      password: '',
      password_confirm: '',
      chosen_name: '',
      legal_name: '',
      pronouns: '',
      safe_call: false,
      safe_text: false,
      safe_voicemail: false,
      contact_window: 'anytime',
      dob_month: '',
      dob_year: '',
      postal_code: '',
      indigenous_identity: '',
      disability: '',
      gender_identity: '',
      consent_privacy: false,
      consent_contact: false,
      consent_terms: false,
      additional_context: '',
    },
  });

  const contactChoice = form.watch('contact_choice');
  const shouldHideCredentials = contactChoice === 'none';
  const isSuccess = state.status === 'success';
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    const isValid = await form.trigger();
    if (!isValid) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

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
    <Form {...form}>
      <form
        action={formAction}
        className="space-y-8 rounded-2xl border border-border/40 bg-background p-6 shadow-sm sm:p-8"
        noValidate
        onSubmit={handleSubmit}
      >
        <input type="hidden" {...form.register('next')} />

        <section className="space-y-4">
          <header>
            <p className="text-xs uppercase text-muted-foreground">New client intake</p>
            <h1 className="text-2xl font-semibold text-foreground">Tell us how to keep you safe</h1>
            <p className="mt-2 text-sm text-muted-foreground">
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
            <Alert className="border-primary bg-primary/10 text-primary">
              <AlertTitle>Intake received</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{state.message ?? 'Thanks for sharing your details. An outreach worker will follow up shortly.'}</p>
                {state.portalCode ? (
                  <p className="font-mono text-sm">
                    Your IHARC code: <strong>{state.portalCode}</strong>. Keep this somewhere safe — you can use it later
                    to claim your online account.
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
        </section>

        <section className="space-y-[calc(2rem-0.75rem)]">
          <FormField
            control={form.control}
            name="contact_choice"
            render={({ field }) => (
              <FormItem className="space-y-3 rounded-xl border border-border/30 p-4">
                <FormLabel className="text-base font-semibold text-foreground">
                  How should we stay in touch about your services?
                </FormLabel>
                <input type="hidden" name="contact_choice" value={field.value} />
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as ContactChoice)}
                    className="grid gap-3 md:grid-cols-2"
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
                </FormControl>
              </FormItem>
            )}
          />

          {(contactChoice === 'email' || contactChoice === 'both') && (
            <FormField
              control={form.control}
              name="contact_email"
              rules={{ required: contactChoice === 'email' || contactChoice === 'both' ? 'Email is required' : false }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="contact_email">Email address</FormLabel>
                  <FormControl>
                    <Input
                      id="contact_email"
                      type="email"
                      autoComplete="email"
                      required={contactChoice === 'email' || contactChoice === 'both'}
                      placeholder="you@example.ca"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {(contactChoice === 'phone' || contactChoice === 'both') && (
            <FormField
              control={form.control}
              name="contact_phone"
              rules={{ required: contactChoice === 'phone' || contactChoice === 'both' ? 'Phone is required' : false }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="contact_phone">Mobile phone</FormLabel>
                  <FormControl>
                    <Input
                      id="contact_phone"
                      type="tel"
                      autoComplete="tel"
                      inputMode="tel"
                      required={contactChoice === 'phone' || contactChoice === 'both'}
                      placeholder="+16475551234"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Include your country code so we can text verification codes if needed.</p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {!shouldHideCredentials ? (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="password"
                rules={{ required: 'Create a password' }}
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="password">Create a password</FormLabel>
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
                    <FormLabel htmlFor="password_confirm">Confirm password</FormLabel>
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
            </div>
          ) : null}

          <FormField
            control={form.control}
            name="chosen_name"
            rules={{ required: 'Name is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="chosen_name">What name should we use with you? *</FormLabel>
                <FormControl>
                  <Input
                    id="chosen_name"
                    required
                    maxLength={120}
                    placeholder="Name you want IHARC to use"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="legal_name"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="legal_name">Legal or government name (optional)</FormLabel>
                  <FormControl>
                    <Input id="legal_name" maxLength={160} placeholder="Only if it helps with benefits or ID" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pronouns"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="pronouns">Pronouns (optional)</FormLabel>
                  <FormControl>
                    <Input id="pronouns" maxLength={80} placeholder="She/her, they/them, he/him, etc." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="safe_call"
            render={({ field }) => (
              <FormItem className="space-y-3 rounded-xl border border-border/30 p-4">
                <FormLabel className="text-base font-semibold text-foreground">Is it safe for us to…</FormLabel>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 text-sm text-foreground">
                    <input type="hidden" name="safe_call" value={field.value ? 'on' : ''} />
                    <FormControl>
                      <Checkbox
                        id="safe_call"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                        className="mt-1"
                      />
                    </FormControl>
                    <FormLabel htmlFor="safe_call" className="font-normal">
                      Call this phone number
                    </FormLabel>
                  </div>
                  <FormField
                    control={form.control}
                    name="safe_text"
                    render={({ field: textField }) => (
                      <div className="flex items-start gap-3 text-sm text-foreground">
                        <input type="hidden" name="safe_text" value={textField.value ? 'on' : ''} />
                        <FormControl>
                          <Checkbox
                            id="safe_text"
                            checked={textField.value}
                            onCheckedChange={(checked) => textField.onChange(Boolean(checked))}
                            className="mt-1"
                          />
                        </FormControl>
                        <FormLabel htmlFor="safe_text" className="font-normal">
                          Send text messages
                        </FormLabel>
                      </div>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="safe_voicemail"
                    render={({ field: voicemailField }) => (
                      <div className="flex items-start gap-3 text-sm text-foreground">
                        <input type="hidden" name="safe_voicemail" value={voicemailField.value ? 'on' : ''} />
                        <FormControl>
                          <Checkbox
                            id="safe_voicemail"
                            checked={voicemailField.value}
                            onCheckedChange={(checked) => voicemailField.onChange(Boolean(checked))}
                            className="mt-1"
                          />
                        </FormControl>
                        <FormLabel htmlFor="safe_voicemail" className="font-normal">
                          Leave a voicemail if you miss our call
                        </FormLabel>
                      </div>
                    )}
                  />
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_window"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="contact_window">Preferred contact window (optional)</FormLabel>
                <input type="hidden" name="contact_window" value={field.value} />
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
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
                </FormControl>
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-4 rounded-xl border border-border/30 p-4">
          <FormLabel className="text-base font-semibold text-foreground">Optional demographic details</FormLabel>
          <p className="text-sm text-muted-foreground">
            These questions help IHARC report on equity outcomes. Share only what feels right — skipping them never
            impacts services.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="dob_month"
              render={({ field }) => (
                <FormItem className="grid gap-[calc(0.5rem-(0.25rem/2))]">
                  <FormLabel htmlFor="dob_month">Birth month</FormLabel>
                  <input type="hidden" name="dob_month" value={field.value ?? ''} />
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dob_year"
              render={({ field }) => (
                <FormItem className="grid gap-[calc(0.5rem-(0.25rem/2))]">
                  <FormLabel htmlFor="dob_year">Birth year</FormLabel>
                  <input type="hidden" name="dob_year" value={field.value ?? ''} />
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="postal_code">Postal code (if any)</FormLabel>
                <FormControl>
                  <Input
                    id="postal_code"
                    maxLength={7}
                    placeholder="A1A 1A1"
                    autoComplete="postal-code"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="indigenous_identity"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="indigenous_identity">Indigenous identity (optional)</FormLabel>
                <FormControl>
                  <Input
                    id="indigenous_identity"
                    maxLength={120}
                    placeholder="Status / Non-status First Nation, Inuit, Métis, etc."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="disability"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="disability">Disability or accessibility notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    id="disability"
                    rows={3}
                    placeholder="Share anything that helps us plan accommodations."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender_identity"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="gender_identity">Gender identity (optional)</FormLabel>
                <FormControl>
                  <Input id="gender_identity" maxLength={120} placeholder="Self-described identity" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-3 rounded-xl border border-border/30 p-4">
          <FormLabel className="text-base font-semibold text-foreground">Consent</FormLabel>
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
                  I understand why IHARC collects my information and how it will be used. <span className="text-destructive">*</span>
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="consent_contact"
            rules={{ required: !shouldHideCredentials }}
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 text-sm text-foreground">
                <input type="hidden" name="consent_contact" value={field.value ? 'on' : ''} />
                <FormControl>
                  <Checkbox
                    id="consent_contact"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    className="mt-1"
                  />
                </FormControl>
                <FormLabel htmlFor="consent_contact" className="font-normal">
                  I consent to IHARC contacting me about my case.
                  {!shouldHideCredentials ? <span className="text-destructive">*</span> : null}
                </FormLabel>
                <FormMessage />
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
                    id="consent_terms"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                    className="mt-1"
                  />
                </FormControl>
                <FormLabel htmlFor="consent_terms" className="font-normal">
                  I agree to the portal Terms and Privacy Policy. <span className="text-destructive">*</span>
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="additional_context"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="additional_context">Anything else we should know?</FormLabel>
                <FormControl>
                  <Textarea
                    id="additional_context"
                    rows={3}
                    placeholder="Safety notes, accessibility needs, or anything urgent you want to flag."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </section>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              We’ll email or text a confirmation as soon as possible. Staff can also look you up with your name and code.
            </p>
            {state.warnings?.length ? (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {state.warnings.map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <SubmitButton isSuccess={isSuccess} />
        </div>
      </form>
    </Form>
  );
}

function ContactOption({ value, title, description }: { value: ContactChoice; title: string; description: string }) {
  return (
    <label
      htmlFor={`contact_choice_${value}`}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/40 bg-card p-3 text-left text-base font-medium text-foreground shadow-sm transition hover:border-primary/60 hover:bg-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-background"
    >
      <RadioGroupItem id={`contact_choice_${value}`} value={value} className="mt-1" />
      <span className="text-base font-medium">
        {title}
        <span className="mt-1 block text-sm font-normal text-muted-foreground">{description}</span>
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
