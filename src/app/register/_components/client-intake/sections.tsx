'use client';

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@shared/ui/form';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { Input } from '@shared/ui/input';
import { Checkbox } from '@shared/ui/checkbox';
import { choiceCardVariants } from '@shared/ui/choice-card';
import { FormSection } from '@shared/ui/form-section';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shared/ui/select';
import { Textarea } from '@shared/ui/textarea';
import type { UseFormReturn } from 'react-hook-form';
import type { ClientIntakeFormValues, ContactChoice } from './types';

export const MONTHS = [
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

export function ContactPreferenceSection({
  form,
  contactChoice,
  shouldHideCredentials,
  }: {
    form: UseFormReturn<ClientIntakeFormValues>;
    contactChoice: ContactChoice;
    shouldHideCredentials: boolean;
  }) {
  return (
    <section className="space-y-5">
      <FormField
        control={form.control}
        name="contact_choice"
        render={({ field }) => (
          <FormSection asChild>
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold text-foreground">How should we stay in touch about your services?</FormLabel>
              <input type="hidden" name="contact_choice" value={field.value} />
              <FormControl>
                <RadioGroup value={field.value} onValueChange={(value) => field.onChange(value as ContactChoice)} className="grid gap-3 md:grid-cols-2">
                  <ContactOption value="email" title="Email" description="We’ll send confirmations and updates to the inbox you share." />
                  <ContactOption value="phone" title="Mobile phone" description="We’ll use text messages and call if it’s safe." />
                  <ContactOption value="both" title="Both email and phone" description="Ideal if your phone changes often but you can access email at times." />
                  <ContactOption value="none" title="I don’t have either right now" description="We’ll generate an 8-digit code you can bring to outreach or the library to finish sign-up." />
                </RadioGroup>
              </FormControl>
            </FormItem>
          </FormSection>
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
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {!shouldHideCredentials ? (
        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            rules={{ required: 'Set a password to secure your portal', minLength: { value: 12, message: 'Use at least 12 characters' } }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="password">Password for your portal</FormLabel>
                <FormControl>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    placeholder="Use a phrase with spaces or symbols"
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
    </section>
  );
}

export function IdentitySection({ form }: { form: UseFormReturn<ClientIntakeFormValues> }) {
  return (
    <section className="space-y-4">
      <FormField
        control={form.control}
        name="chosen_name"
        rules={{ required: 'Name is required' }}
        render={({ field }) => (
          <FormItem className="grid gap-2">
            <FormLabel htmlFor="chosen_name">What name should we use with you? *</FormLabel>
            <FormControl>
              <Input id="chosen_name" required maxLength={120} placeholder="Name you want IHARC to use" {...field} />
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
    </section>
  );
}

export function SafetySection({ form }: { form: UseFormReturn<ClientIntakeFormValues> }) {
  return (
    <section className="space-y-4">
      <FormField
        control={form.control}
        name="safe_call"
        render={({ field }) => (
          <FormSection asChild>
            <FormItem className="space-y-3">
              <FormLabel className="text-base font-semibold text-foreground">Is it safe for us to…</FormLabel>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm text-foreground">
                  <input type="hidden" name="safe_call" value={field.value ? 'on' : ''} />
                  <FormControl>
                    <Checkbox id="safe_call" checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} className="mt-1" />
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
                        <Checkbox id="safe_text" checked={textField.value} onCheckedChange={(checked) => textField.onChange(Boolean(checked))} className="mt-1" />
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
          </FormSection>
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
  );
}

export function DemographicsSection({ form, dobYears }: { form: UseFormReturn<ClientIntakeFormValues>; dobYears: number[] }) {
  return (
    <FormSection asChild>
      <section className="space-y-4">
      <p className="text-base font-semibold text-foreground">Optional demographic details</p>
      <p className="text-sm text-muted-foreground">
        These questions help IHARC report on equity outcomes. Share only what feels right — skipping them never impacts services.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <FormField
        control={form.control}
        name="dob_month"
        render={({ field }) => (
          <FormItem className="grid gap-1.5">
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
          <FormItem className="grid gap-1.5">
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
              <Input id="postal_code" maxLength={7} placeholder="A1A 1A1" autoComplete="postal-code" {...field} />
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

      <div className="grid gap-3 md:grid-cols-2">
        <FormField
          control={form.control}
          name="disability"
          render={({ field }) => (
            <FormItem className="grid gap-2">
              <FormLabel htmlFor="disability">Disability (optional)</FormLabel>
              <FormControl>
                <Input id="disability" maxLength={160} placeholder="e.g., Mobility, neurodivergence, chronic pain" {...field} />
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
                <Input id="gender_identity" maxLength={120} placeholder="e.g., Woman, Two-Spirit, Non-binary" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      </section>
    </FormSection>
  );
}

export function ConsentSection({ form }: { form: UseFormReturn<ClientIntakeFormValues> }) {
  return (
    <FormSection asChild surface="soft">
      <section className="space-y-3">
      <p className="text-base font-semibold text-foreground">Consents</p>
      <FormField
        control={form.control}
        name="consent_privacy"
        rules={{ required: 'Privacy consent is required' }}
        render={({ field }) => (
          <FormItem className="flex items-start gap-3 text-sm text-foreground">
            <input type="hidden" name="consent_privacy" value={field.value ? 'on' : ''} />
            <FormControl>
              <Checkbox
                id="consent_privacy"
                required
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                className="mt-1"
              />
            </FormControl>
            <FormLabel htmlFor="consent_privacy" className="font-normal">
              I agree to IHARC&apos;s privacy policy and consent to secure storage of my information. <span className="text-destructive">*</span>
            </FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="consent_contact"
        rules={{ required: 'Contact consent is required' }}
        render={({ field }) => (
          <FormItem className="flex items-start gap-3 text-sm text-foreground">
            <input type="hidden" name="consent_contact" value={field.value ? 'on' : ''} />
            <FormControl>
              <Checkbox
                id="consent_contact"
                required
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                className="mt-1"
              />
            </FormControl>
            <FormLabel htmlFor="consent_contact" className="font-normal">
              I consent to IHARC contacting me about services and to share updates related to my requests. <span className="text-destructive">*</span>
            </FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="consent_terms"
        rules={{ required: 'Terms acceptance is required' }}
        render={({ field }) => (
          <FormItem className="flex items-start gap-3 text-sm text-foreground">
            <input type="hidden" name="consent_terms" value={field.value ? 'on' : ''} />
            <FormControl>
              <Checkbox
                id="consent_terms"
                required
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                className="mt-1"
              />
            </FormControl>
            <FormLabel htmlFor="consent_terms" className="font-normal">
              I confirm the information I share is accurate to the best of my knowledge. <span className="text-destructive">*</span>
            </FormLabel>
            <FormMessage />
          </FormItem>
        )}
      />
      </section>
    </FormSection>
  );
}

export function AdditionalContextSection({ form }: { form: UseFormReturn<ClientIntakeFormValues> }) {
  return (
    <section className="space-y-2">
      <FormField
        control={form.control}
        name="additional_context"
        render={({ field }) => (
          <FormItem className="grid gap-2">
            <FormLabel htmlFor="additional_context">Anything else you want us to know?</FormLabel>
            <FormControl>
              <Textarea
                id="additional_context"
                rows={4}
                placeholder="Share urgent needs, accessibility needs, or how we can reach you safely."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </section>
  );
}

function ContactOption({ value, title, description }: { value: ContactChoice; title: string; description: string }) {
  return (
    <label
      htmlFor={`contact_choice_${value}`}
      className={choiceCardVariants({
        layout: 'column',
        surface: 'cardSoft',
        borderTone: 'subtle',
        radius: 'lg',
        padding: 'stack',
        hover: 'border',
      })}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-semibold text-foreground">{title}</span>
        <RadioGroupItem id={`contact_choice_${value}`} value={value} className="mt-1" />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </label>
  );
}
