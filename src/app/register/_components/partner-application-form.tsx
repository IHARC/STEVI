'use client';

import { useActionState } from 'react';
import type { FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Checkbox } from '@shared/ui/checkbox';
import { FormSection } from '@shared/ui/form-section';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';

export type PartnerApplicationState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

export const PARTNER_APPLICATION_INITIAL_STATE: PartnerApplicationState = {
  status: 'idle',
};

type PartnerApplicationValues = {
  next: string;
  full_name: string;
  role_title: string;
  organization_name: string;
  work_email: string;
  password: string;
  password_confirm: string;
  work_phone: string;
  programs_supported: string;
  data_requirements: string;
  consent_privacy: boolean;
  consent_terms: boolean;
  consent_notifications: boolean;
};

type PartnerApplicationFormProps = {
  action: (state: PartnerApplicationState, formData: FormData) => Promise<PartnerApplicationState>;
  initialState?: PartnerApplicationState;
  nextPath: string;
};

export function PartnerApplicationForm({
  action,
  initialState = PARTNER_APPLICATION_INITIAL_STATE,
  nextPath,
}: PartnerApplicationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<PartnerApplicationValues>({
    defaultValues: {
      next: nextPath,
      full_name: '',
      role_title: '',
      organization_name: '',
      work_email: '',
      password: '',
      password_confirm: '',
      work_phone: '',
      programs_supported: '',
      data_requirements: '',
      consent_privacy: false,
      consent_terms: false,
      consent_notifications: true,
    },
  });
  const isSuccess = state.status === 'success';
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    const isValid = await form.trigger();
    if (!isValid) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <Form {...form}>
      <form
        action={formAction}
        className="space-y-6 rounded-3xl border border-border/40 bg-background p-6 shadow-sm sm:p-8"
        noValidate
        onSubmit={handleSubmit}
      >
        <input type="hidden" {...form.register('next')} />

        <section className="space-y-3">
          <header>
            <p className="text-xs uppercase text-muted-foreground">Partner access</p>
            <h1 className="text-xl font-medium text-foreground">Request partner verification</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Share your agency details so we can confirm the data-sharing agreement and scope your access appropriately.
            </p>
          </header>

          {state.error ? (
            <Alert variant="destructive" className="text-sm">
              <AlertTitle>We couldn’t submit your application</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          {isSuccess && state.message ? (
            <Alert className="border-primary bg-primary/10 text-sm text-primary">
              <AlertTitle>Application submitted</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={form.control}
              name="full_name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="full_name">Your name *</FormLabel>
                  <FormControl>
                    <Input id="full_name" autoComplete="name" required maxLength={120} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role_title"
              rules={{ required: 'Role is required' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="role_title">Role or title *</FormLabel>
                  <FormControl>
                    <Input
                      id="role_title"
                      required
                      maxLength={120}
                      placeholder="Outreach coordinator, housing navigator…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="organization_name"
            rules={{ required: 'Organization is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="organization_name">Organization *</FormLabel>
                <FormControl>
                  <Input
                    id="organization_name"
                    required
                    maxLength={180}
                    placeholder="Agency name"
                    autoComplete="organization"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="work_email"
            rules={{ required: 'Work email is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="work_email">Work email *</FormLabel>
                <FormControl>
                  <Input
                    id="work_email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@agency.ca"
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Use a work email so our team can confirm your domain and agreement status quickly.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-3 md:grid-cols-2">
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
              rules={{ required: 'Confirm your password' }}
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
          </div>

          <FormField
            control={form.control}
            name="work_phone"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="work_phone">Phone number (optional)</FormLabel>
                <FormControl>
                  <Input
                    id="work_phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+16475551234"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="programs_supported"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="programs_supported">Which IHARC programs or teams will you support?</FormLabel>
                <FormControl>
                  <Textarea
                    id="programs_supported"
                    rows={3}
                    placeholder="Encampment response, Health outreach, Resource publishing…"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_requirements"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="data_requirements">What data do you need access to?</FormLabel>
                <FormControl>
                  <Textarea
                    id="data_requirements"
                    rows={3}
                    placeholder="Example: Upload case notes, view client referrals for housing program, update shared outreach schedules."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormSection asChild>
            <div className="space-y-3">
            <FormField
              control={form.control}
              name="consent_privacy"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 text-sm text-foreground">
                  <input type="hidden" name="consent_privacy" value={field.value ? 'on' : ''} />
                  <FormControl>
                    <Checkbox
                      id="consent_privacy_partner"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel htmlFor="consent_privacy_partner" className="font-normal">
                    I confirm our agency has (or is pursuing) a data-sharing agreement with IHARC. <span className="text-destructive">*</span>
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
                      id="consent_terms_partner"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel htmlFor="consent_terms_partner" className="font-normal">
                    I agree to the portal Terms, Privacy Policy, and audit logging expectations. <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consent_notifications"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 text-sm text-foreground">
                  <input type="hidden" name="consent_notifications" value={field.value ? 'on' : ''} />
                  <FormControl>
                    <Checkbox
                      id="consent_notifications_partner"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel htmlFor="consent_notifications_partner" className="font-normal">
                    Send me partner onboarding resources and policy updates.
                  </FormLabel>
                </FormItem>
              )}
            />
            </div>
          </FormSection>
        </section>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Partner access stays pending until IHARC staff review your application and confirm least-privilege scopes.
          </p>
          <SubmitButton isSuccess={isSuccess} />
        </div>
      </form>
    </Form>
  );
}

function SubmitButton({ isSuccess }: { isSuccess: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || isSuccess} className="min-w-[180px] justify-center">
      {pending ? 'Submitting...' : isSuccess ? 'Application sent' : 'Submit application'}
    </Button>
  );
}
