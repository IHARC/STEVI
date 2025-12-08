'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Checkbox } from '@shared/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';

export type VolunteerApplicationState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

export const VOLUNTEER_APPLICATION_INITIAL_STATE: VolunteerApplicationState = {
  status: 'idle',
};

type VolunteerApplicationValues = {
  next: string;
  full_name: string;
  pronouns: string;
  email: string;
  phone: string;
  interests: string;
  availability: string;
  password: string;
  password_confirm: string;
  consent_privacy: boolean;
  consent_terms: boolean;
  consent_screening: boolean;
};

type VolunteerApplicationFormProps = {
  action: (state: VolunteerApplicationState, formData: FormData) => Promise<VolunteerApplicationState>;
  initialState?: VolunteerApplicationState;
  nextPath: string;
};

export function VolunteerApplicationForm({
  action,
  initialState = VOLUNTEER_APPLICATION_INITIAL_STATE,
  nextPath,
}: VolunteerApplicationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<VolunteerApplicationValues>({
    defaultValues: {
      next: nextPath,
      full_name: '',
      pronouns: '',
      email: '',
      phone: '',
      interests: '',
      availability: '',
      password: '',
      password_confirm: '',
      consent_privacy: false,
      consent_terms: false,
      consent_screening: false,
    },
  });
  const isSuccess = state.status === 'success';

  return (
    <Form {...form}>
      <form
        action={formAction}
        className="space-y-6 rounded-3xl border border-border/40 bg-background p-6 shadow-sm sm:p-8"
        noValidate
      >
        <input type="hidden" {...form.register('next')} />

        <section className="space-y-3">
          <header>
            <p className="text-xs uppercase text-muted-foreground">Volunteer onboarding</p>
            <h1 className="text-xl font-medium text-foreground">Apply as a volunteer</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell us how you’d like to help neighbours. We’ll reach out about orientation, background checks, and shifts.
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
              <AlertTitle>Volunteer application received</AlertTitle>
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
              name="pronouns"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="pronouns">Pronouns (optional)</FormLabel>
                  <FormControl>
                    <Input id="pronouns" maxLength={80} placeholder="She/her, they/them…" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            rules={{ required: 'Email is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="email">Email *</FormLabel>
                <FormControl>
                  <Input id="email" type="email" autoComplete="email" required placeholder="you@example.ca" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="phone">Phone (optional)</FormLabel>
                <FormControl>
                  <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+16475551234" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interests"
            rules={{ required: 'Describe how you would like to help' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="interests">How would you like to help? *</FormLabel>
                <FormControl>
                  <Textarea
                    id="interests"
                    rows={3}
                    required
                    placeholder="Example: outreach meal prep, winter clothing drives, art drop-ins, transportation."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="availability"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="availability">Availability (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    id="availability"
                    rows={2}
                    placeholder="Weekday evenings, weekends, once a month, etc."
                    {...field}
                  />
                </FormControl>
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
          </div>

          <div className="space-y-3 rounded-xl border border-border/30 p-4">
            <FormField
              control={form.control}
              name="consent_privacy"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 text-sm text-foreground">
                  <input type="hidden" name="consent_privacy" value={field.value ? 'on' : ''} />
                  <FormControl>
                    <Checkbox
                      id="consent_privacy_volunteer"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel htmlFor="consent_privacy_volunteer" className="font-normal">
                    I understand IHARC will store my application and contact me about volunteer onboarding. <span className="text-destructive">*</span>
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
                      id="consent_terms_volunteer"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel htmlFor="consent_terms_volunteer" className="font-normal">
                    I agree to follow IHARC’s volunteer code of conduct and privacy practices. <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="consent_screening"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem className="flex items-start gap-3 text-sm text-foreground">
                  <input type="hidden" name="consent_screening" value={field.value ? 'on' : ''} />
                  <FormControl>
                    <Checkbox
                      id="consent_screening"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      className="mt-1"
                    />
                  </FormControl>
                  <FormLabel htmlFor="consent_screening" className="font-normal">
                    I consent to required screenings (background checks, references) before volunteering. <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            Volunteers receive limited access until screening and training are complete. You can withdraw at any time.
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
