'use client';

import { startTransition, useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

export function ResetPasswordForm({ action, initialState }: ResetPasswordFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>(initialState.contactMethod ?? 'email');
  const [phoneInput, setPhoneInput] = useState(state.phone ?? '');

  useEffect(() => {
    const nextMethod = state.contactMethod;
    if (nextMethod && nextMethod !== contactMethod) {
      startTransition(() => {
        setContactMethod(nextMethod);
      });
    }
  }, [state.contactMethod, contactMethod]);

  useEffect(() => {
    if (state.status === 'success') {
      startTransition(() => {
        setPhoneInput('');
      });
    }
    if (state.phone) {
      startTransition(() => {
        setPhoneInput(state.phone ?? '');
      });
    }
  }, [state.status, state.phone]);

  const otpPending = state.status === 'otp_sent' && contactMethod === 'phone';

  const maskedPhone = useMemo(() => {
    if (otpPending) {
      return state.maskedPhone ?? (state.phone ? maskPhoneNumber(state.phone) : null);
    }
    if (!phoneInput) {
      return null;
    }
    return maskPhoneNumber(phoneInput) || phoneInput;
  }, [otpPending, state.maskedPhone, state.phone, phoneInput]);

  return (
    <form action={formAction} className="grid gap-6 rounded-2xl border border-outline/20 bg-surface p-6 shadow-subtle">
      <div className="space-y-2">
        <h1 className="text-headline-md font-semibold tracking-tight text-on-surface">Reset your password</h1>
        <p className="text-body-md text-on-surface/70">
          Choose how you would like to verify your identity. We will send a secure link or code before you set a new
          password.
        </p>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-outline/25 p-4">
        <legend className="text-body-md font-semibold text-on-surface">Choose verification method</legend>
        <RadioGroup
          name="contact_method"
          value={contactMethod}
          onValueChange={(value) => setContactMethod(value as 'email' | 'phone')}
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
      </fieldset>

      {contactMethod === 'email' ? (
        <div className="grid gap-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.ca"
          />
          <p className="text-label-sm text-muted">We will email a secure link to update your password.</p>
        </div>
      ) : (
        <>
          <input type="hidden" name="stage" value={otpPending ? 'verify' : 'request'} />
          {otpPending ? <input type="hidden" name="otp_phone" value={state.phone ?? phoneInput} /> : null}
          <div className="grid gap-2">
            <Label htmlFor="reset-phone">Phone number</Label>
            <Input
              id="reset-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+16475551234"
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              disabled={otpPending}
              required={!otpPending}
            />
            <p className="text-label-sm text-muted">Include your country code so we can text you a verification code.</p>
          </div>

          {otpPending ? (
            <div className="grid gap-2">
              <Label htmlFor="reset-otp">Verification code</Label>
              <Input
                id="reset-otp"
                name="otp_code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                required
              />
              <p className="text-label-sm text-muted">
                We texted a 6-digit code to {maskedPhone ?? 'your phone number'}. Codes expire after 5 minutes.
              </p>
            </div>
          ) : null}

          {otpPending && state.message ? (
            <p className="text-label-sm font-medium text-primary">{state.message}</p>
          ) : null}

          {otpPending ? (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="reset-new-password">New password</Label>
                <Input
                  id="reset-new-password"
                  name="new_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                <Input
                  id="reset-confirm-password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>
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
        <Alert className="border-secondary/40 bg-secondary/10 text-on-secondary-container">
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
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-outline/40 bg-surface-container p-3 text-body-md font-medium text-on-surface shadow-subtle transition hover:border-primary/40 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary"
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <span>
        {title}
        <span className="mt-1 block text-label-sm font-normal text-muted">{description}</span>
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
