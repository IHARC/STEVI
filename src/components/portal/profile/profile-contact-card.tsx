'use client';

import { startTransition, useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const [phoneInput, setPhoneInput] = useState(initialPhone ?? '');

  const otpPending = phoneState.status === 'otp_sent';
  const phoneFieldDisabled = otpPending;

  useEffect(() => {
    if (phoneState.status === 'success' && phoneState.phone) {
      startTransition(() => {
        setPhoneInput(phoneState.phone);
      });
    }
    if (phoneState.status === 'idle' && !otpPending && phoneState.phone === undefined && initialPhone && !phoneInput) {
      startTransition(() => {
        setPhoneInput(initialPhone);
      });
    }
  }, [phoneState, otpPending, initialPhone, phoneInput]);

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
    <section className="grid gap-6 rounded-2xl border border-outline/20 bg-surface p-6 shadow-subtle">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-on-surface">Contact preferences</h2>
        <p className="text-sm text-on-surface/70">
          Let outreach staff know the best way to reach you about appointments, documents, and plan updates.
        </p>
      </div>

      <form action={emailFormAction} className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={initialEmail ?? ''}
            placeholder="you@example.ca"
          />
          <p className="text-xs text-muted">
            We send verification, document links, and password reset emails here. Leave blank if you prefer phone updates only.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
          <EmailSubmitButton />
          {emailState.message ? (
            <span
              className={`text-sm ${emailState.status === 'success' ? 'text-success' : 'text-muted'}`}
              role={emailState.status === 'success' ? 'status' : undefined}
            >
              {emailState.message}
            </span>
          ) : null}
        </div>
        {emailState.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not update your email</AlertTitle>
            <AlertDescription>{emailState.error}</AlertDescription>
          </Alert>
        ) : null}
      </form>

      <form action={phoneFormAction} className="grid gap-3">
        <input type="hidden" name="stage" value={otpPending ? 'verify' : 'request'} />
        {otpPending ? (
          <input type="hidden" name="otp_phone" value={phoneState.phone ?? phoneInput} />
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="profile-phone">Phone number</Label>
          <Input
            id="profile-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={phoneInput}
            onChange={(event) => setPhoneInput(event.target.value)}
            placeholder="+16475551234"
            disabled={phoneFieldDisabled}
          />
          <p className="text-xs text-muted">
            Include your country code so we can text verification codes or urgent appointment updates.
          </p>
        </div>

        {otpPending ? (
          <div className="grid gap-2">
            <Label htmlFor="profile-phone-otp">Verification code</Label>
            <Input
              id="profile-phone-otp"
              name="otp_code"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="123456"
              required
            />
            <p className="text-xs text-muted">
              We texted a 6-digit code to {maskedPhone ?? 'your phone number'}. Codes expire after 5 minutes.
            </p>
          </div>
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
            <span className="text-sm text-muted">{phoneState.message}</span>
          ) : null}
        </div>

        {phoneState.error ? (
          <Alert variant="destructive">
            <AlertTitle>We could not update your phone number</AlertTitle>
            <AlertDescription>{phoneState.error}</AlertDescription>
          </Alert>
        ) : null}

        {otpPending && phoneState.message ? (
          <Alert className="border-primary/30 bg-primary/10 text-sm text-on-primary-container">
            <AlertDescription>{phoneState.message}</AlertDescription>
          </Alert>
        ) : null}

        {phoneState.status === 'success' && phoneState.message ? (
          <Alert className="border-success/40 bg-success/10 text-success">
            <AlertDescription>{phoneState.message}</AlertDescription>
          </Alert>
        ) : null}
      </form>
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
