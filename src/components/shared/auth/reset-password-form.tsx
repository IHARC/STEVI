'use client';

import { startTransition, useActionState, useEffect, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { choiceCardVariants } from '@shared/ui/choice-card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { maskPhoneNumber } from '@/lib/phone';

export type ResetPasswordState = {
  status: 'idle' | 'otp_sent' | 'success';
  contactMethod: 'email' | 'phone';
  error?: string;
  message?: string;
  phone?: string;
  maskedPhone?: string;
};

type ResetPasswordFormProps = {
  action: (state: ResetPasswordState, formData: FormData) => Promise<ResetPasswordState>;
  initialState: ResetPasswordState;
};

type ResetPasswordValues = {
  contact_method: 'email' | 'phone';
  email: string;
  phone: string;
  otp_code: string;
  stage: 'request' | 'verify';
  otp_phone: string;
  new_password: string;
  confirm_password: string;
};

export function ResetPasswordForm({ action, initialState }: ResetPasswordFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const form = useForm<ResetPasswordValues>({
    defaultValues: {
      contact_method: initialState.contactMethod ?? 'email',
      email: '',
      phone: initialState.phone ?? '',
      otp_code: '',
      stage: initialState.status === 'otp_sent' ? 'verify' : 'request',
      otp_phone: initialState.phone ?? '',
      new_password: '',
      confirm_password: '',
    },
  });

  const contactMethod = form.watch('contact_method');
  const phoneInput = form.watch('phone');
  const otpPending = state.status === 'otp_sent' && contactMethod === 'phone';

  useEffect(() => {
    const nextMethod = state.contactMethod;
    if (nextMethod && nextMethod !== contactMethod) {
      startTransition(() => {
        form.setValue('contact_method', nextMethod);
      });
    }
  }, [contactMethod, form, state.contactMethod]);

  useEffect(() => {
    startTransition(() => {
      form.setValue('stage', otpPending ? 'verify' : 'request');
      form.setValue('otp_phone', state.phone ?? phoneInput ?? '');
      if (state.status === 'success') {
        form.reset({
          ...form.getValues(),
          phone: '',
          otp_code: '',
          new_password: '',
          confirm_password: '',
        });
      }
      if (state.phone) {
        form.setValue('phone', state.phone);
      }
    });
  }, [form, otpPending, phoneInput, state.phone, state.status]);

  const maskedPhone = useMemo(() => {
    if (otpPending) {
      const source = state.phone ?? phoneInput;
      if (!source) return null;
      return state.maskedPhone ?? maskPhoneNumber(source) ?? source;
    }

    if (!phoneInput) return null;
    return maskPhoneNumber(phoneInput) ?? phoneInput;
  }, [otpPending, phoneInput, state.maskedPhone, state.phone]);

  return (
    <Form {...form}>
      <form action={formAction} className="grid gap-6 rounded-2xl border border-border/40 bg-background p-6 shadow-sm">
        <input type="hidden" {...form.register('stage')} />
        <input type="hidden" {...form.register('otp_phone')} />

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Reset your password</h1>
          <p className="text-sm text-foreground/70">
            Choose how you would like to verify your identity. We will send a secure link or code before you set a new
            password.
          </p>
        </div>

        <FormField
          control={form.control}
          name="contact_method"
          render={({ field }) => (
            <FormItem className="space-y-3 rounded-xl border border-border/25 p-4">
              <legend className="text-sm font-semibold text-foreground">Choose verification method</legend>
              <FormControl>
                <div className="space-y-3">
                  <input type="hidden" name="contact_method" value={field.value} />
                  <RadioGroup
                    value={field.value}
                    onValueChange={(value) => field.onChange(value as 'email' | 'phone')}
                    className="grid gap-3 md:grid-cols-2"
                  >
                    <ContactOption
                      id="reset-contact-email"
                      value="email"
                      title="Email"
                      description="Send me a password reset link"
                    />
                    <ContactOption
                      id="reset-contact-phone"
                      value="phone"
                      title="Phone"
                      description="Send me a verification code by text"
                    />
                  </RadioGroup>
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        {contactMethod === 'email' ? (
          <FormField
            control={form.control}
            name="email"
            rules={{ required: 'Email is required' }}
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input id="reset-email" type="email" autoComplete="email" required placeholder="you@example.ca" {...field} />
                </FormControl>
                <FormDescription>We will email a secure link to update your password.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <>
            <FormField
              control={form.control}
              name="phone"
              rules={{ required: !otpPending ? 'Phone number is required' : false }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="reset-phone">Phone number</FormLabel>
                  <FormControl>
                    <Input
                      id="reset-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+16475551234"
                      disabled={otpPending}
                      required={!otpPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include your country code so we can text you a verification code.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {otpPending ? (
              <FormField
                control={form.control}
                name="otp_code"
                rules={{ required: 'Enter the 6-digit code we sent' }}
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel htmlFor="reset-otp">Verification code</FormLabel>
                    <FormControl>
                      <Input
                        id="reset-otp"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="123456"
                        required
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      We texted a 6-digit code to {maskedPhone ?? 'your phone number'}. Codes expire after 5 minutes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {otpPending && state.message ? <p className="text-xs font-medium text-primary">{state.message}</p> : null}

            {otpPending ? (
              <div className="grid gap-2 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="new_password"
                  rules={{ required: 'Create a new password' }}
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="reset-new-password">New password</FormLabel>
                      <FormControl>
                        <Input id="reset-new-password" type="password" autoComplete="new-password" minLength={8} required {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm_password"
                  rules={{ required: 'Confirm your new password' }}
                  render={({ field }) => (
                    <FormItem className="grid gap-2">
                      <FormLabel htmlFor="reset-confirm-password">Confirm new password</FormLabel>
                      <FormControl>
                        <Input
                          id="reset-confirm-password"
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          required
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : null}
          </>
        )}

        {state.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not reset your password</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}

        {state.status === 'success' && state.message ? (
          <Alert className="border-secondary bg-secondary/15 text-secondary-foreground">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <ResetSubmitButton otpPending={otpPending} contactMethod={contactMethod} />
          {otpPending ? (
            <Button type="submit" name="intent" value="cancel" variant="outline" formNoValidate>
              Use a different number
            </Button>
          ) : null}
        </div>
      </form>
    </Form>
  );
}

type ContactOptionProps = {
  id: string;
  value: 'email' | 'phone';
  title: string;
  description: string;
};

function ContactOption({ id, value, title, description }: ContactOptionProps) {
  return (
    <label
      htmlFor={id}
      className={choiceCardVariants()}
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-1 block text-xs font-normal text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function ResetSubmitButton({
  otpPending,
  contactMethod,
}: {
  otpPending: boolean;
  contactMethod: 'email' | 'phone';
}) {
  const { pending } = useFormStatus();
  const label = otpPending ? 'Verify code & update password' : contactMethod === 'email' ? 'Send reset link' : 'Send verification code';
  const pendingLabel = otpPending ? 'Updating...' : contactMethod === 'email' ? 'Sending...' : 'Sending...';

  return (
    <Button type="submit" disabled={pending} className="w-full justify-center sm:w-auto">
      {pending ? pendingLabel : label}
    </Button>
  );
}
