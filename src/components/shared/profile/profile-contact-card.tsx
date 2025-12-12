'use client';

import { startTransition, useActionState, useEffect, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@shared/ui/alert';
import { Button } from '@shared/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@shared/ui/form';
import { Input } from '@shared/ui/input';
import { maskPhoneNumber } from '@/lib/phone';

export type EmailFormState = {
  status: 'idle' | 'success';
  error?: string;
  message?: string;
};

export type PhoneFormState = {
  status: 'idle' | 'otp_sent' | 'success';
  error?: string;
  message?: string;
  phone?: string;
  maskedPhone?: string;
};

type ProfileContactCardProps = {
  initialEmail: string | null;
  initialPhone: string | null;
  emailAction: (state: EmailFormState, formData: FormData) => Promise<EmailFormState>;
  phoneAction: (state: PhoneFormState, formData: FormData) => Promise<PhoneFormState>;
  initialEmailState: EmailFormState;
  initialPhoneState: PhoneFormState;
};

export function ProfileContactCard({
  initialEmail,
  initialPhone,
  emailAction,
  phoneAction,
  initialEmailState,
  initialPhoneState,
}: ProfileContactCardProps) {
  const [emailState, emailFormAction] = useActionState(emailAction, initialEmailState);
  const [phoneState, phoneFormAction] = useActionState(phoneAction, initialPhoneState);

  const emailForm = useForm<{ email: string }>({
    defaultValues: {
      email: initialEmail ?? '',
    },
  });

  const phoneForm = useForm<{
    phone: string;
    stage: 'request' | 'verify';
    otp_phone: string;
    otp_code: string;
  }>({
    defaultValues: {
      phone: initialPhone ?? '',
      stage: initialPhoneState.status === 'otp_sent' ? 'verify' : 'request',
      otp_phone: initialPhone ?? '',
      otp_code: '',
    },
  });

  const phoneInput = phoneForm.watch('phone');

  const otpPending = phoneState.status === 'otp_sent';
  const phoneFieldDisabled = otpPending;

  useEffect(() => {
    if (phoneState.status === 'success' && phoneState.phone) {
      startTransition(() => {
        phoneForm.setValue('phone', phoneState.phone ?? '');
        phoneForm.setValue('otp_phone', phoneState.phone ?? '');
        phoneForm.setValue('stage', 'request');
        phoneForm.resetField('otp_code', { keepDirty: false });
      });
      return;
    }

    if (otpPending) {
      startTransition(() => {
        phoneForm.setValue('stage', 'verify');
        phoneForm.setValue('otp_phone', phoneState.phone ?? phoneInput ?? '');
      });
      return;
    }

    startTransition(() => {
      phoneForm.setValue('stage', 'request');
      if (initialPhone && !phoneInput) {
        phoneForm.setValue('phone', initialPhone);
        phoneForm.setValue('otp_phone', initialPhone);
      }
    });
  }, [initialPhone, otpPending, phoneForm, phoneInput, phoneState]);

  useEffect(() => {
    if (!otpPending) {
      phoneForm.setValue('otp_phone', phoneInput ?? '');
    }
  }, [otpPending, phoneForm, phoneInput]);

  const maskedPhone = useMemo(() => {
    if (otpPending) {
      return phoneState.maskedPhone ?? (phoneState.phone ? maskPhoneNumber(phoneState.phone) : null);
    }
    if (!phoneInput) {
      return null;
    }
    return maskPhoneNumber(phoneInput) || phoneInput;
  }, [otpPending, phoneState.maskedPhone, phoneState.phone, phoneInput]);

  return (
    <section className="grid gap-6 rounded-3xl border border-border/40 bg-background p-6 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-medium text-foreground">Contact preferences</h2>
        <p className="text-sm text-foreground/70">
          Let outreach staff know the best way to reach you about appointments, documents, and plan updates.
        </p>
      </div>

      <Form {...emailForm}>
        <form action={emailFormAction} className="grid gap-3">
          <FormField
            control={emailForm.control}
            name="email"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="profile-email">Email</FormLabel>
                <FormControl>
                  <Input
                    id="profile-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.ca"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  We send verification, document links, and password reset emails here. Leave blank if you prefer phone updates only.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <EmailSubmitButton />
            {emailState.message ? (
              <span
                className={`text-sm ${emailState.status === 'success' ? 'text-primary' : 'text-muted-foreground'}`}
                role={emailState.status === 'success' ? 'status' : undefined}
              >
                {emailState.message}
              </span>
            ) : null}
          </div>
          {emailState.error ? (
            <Alert variant="destructive" className="text-sm">
              <AlertTitle>We could not update your email</AlertTitle>
              <AlertDescription>{emailState.error}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </Form>

      <Form {...phoneForm}>
        <form action={phoneFormAction} className="grid gap-3">
          <input type="hidden" {...phoneForm.register('stage')} />
          <input type="hidden" {...phoneForm.register('otp_phone')} />
          <FormField
            control={phoneForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="grid gap-2">
                <FormLabel htmlFor="profile-phone">Phone number</FormLabel>
                <FormControl>
                  <Input
                    id="profile-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+16475551234"
                    disabled={phoneFieldDisabled}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Include your country code so we can text verification codes or urgent appointment updates.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {otpPending ? (
            <FormField
              control={phoneForm.control}
              name="otp_code"
              rules={{ required: 'Enter the code we texted you' }}
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="profile-phone-otp">Verification code</FormLabel>
                  <FormControl>
                    <Input
                      id="profile-phone-otp"
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

          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <PhoneSubmitButton otpPending={otpPending} />
            {otpPending ? (
              <Button
                type="submit"
                name="intent"
                value="cancel"
                variant="outline"
                className="sm:w-auto"
                formNoValidate
              >
                Use a different number
              </Button>
            ) : null}
            {!otpPending && phoneState.message && phoneState.status !== 'success' ? (
              <span className="text-sm text-muted-foreground">{phoneState.message}</span>
            ) : null}
          </div>

          {phoneState.error ? (
            <Alert variant="destructive" className="text-sm">
              <AlertTitle>We could not update your phone number</AlertTitle>
              <AlertDescription>{phoneState.error}</AlertDescription>
            </Alert>
          ) : null}

          {otpPending && phoneState.message ? (
            <Alert className="border-primary bg-primary/10 text-sm text-primary">
              <AlertDescription>{phoneState.message}</AlertDescription>
            </Alert>
          ) : null}

          {phoneState.status === 'success' && phoneState.message ? (
            <Alert className="border-secondary bg-secondary/15 text-secondary-foreground">
              <AlertDescription>{phoneState.message}</AlertDescription>
            </Alert>
          ) : null}
        </form>
      </Form>
    </section>
  );
}

function EmailSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full justify-center sm:w-auto">
      {pending ? 'Sending...' : 'Send verification link'}
    </Button>
  );
}

function PhoneSubmitButton({ otpPending }: { otpPending: boolean }) {
  const { pending } = useFormStatus();
  const label = otpPending ? 'Verify code' : 'Text me a code';
  const pendingLabel = otpPending ? 'Verifying...' : 'Sending...';

  return (
    <Button type="submit" disabled={pending} className="w-full justify-center sm:w-auto">
      {pending ? pendingLabel : label}
    </Button>
  );
}
