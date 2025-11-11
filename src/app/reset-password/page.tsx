import { ResetPasswordForm, type ResetPasswordState } from '@/components/auth/reset-password-form';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeEmail } from '@/lib/email';
import { normalizePhoneNumber, maskPhoneNumber } from '@/lib/phone';
import {
  getOrCreateCsrfToken,
  validateCsrfFromForm,
  InvalidCsrfTokenError,
  CSRF_ERROR_MESSAGE,
} from '@/lib/csrf';

export const dynamic = 'force-dynamic';

type ResetPasswordResult = ResetPasswordState;

const INITIAL_STATE: ResetPasswordState = {
  status: 'idle',
  contactMethod: 'email',
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://iharc.ca';

export default async function ResetPasswordPage() {
  const csrfToken = await getOrCreateCsrfToken();
  async function resetPassword(prevState: ResetPasswordState, formData: FormData): Promise<ResetPasswordResult> {
    'use server';

    try {
      await validateCsrfFromForm(formData);
    } catch (error) {
      if (error instanceof InvalidCsrfTokenError) {
        return { status: 'idle', contactMethod: 'email', error: CSRF_ERROR_MESSAGE };
      }
      throw error;
    }

    const contactMethod = normalizeContactMethod(formData.get('contact_method'));

    if (contactMethod === 'email') {
      const email = normalizeEmail(formData.get('email'));
      if (!email) {
        return { status: 'idle', contactMethod: 'email', error: 'Enter the email linked to your account.' };
      }

      try {
        const supa = await createSupabaseServerClient();
        const { error } = await supa.auth.resetPasswordForEmail(email, {
          redirectTo: `${APP_URL}/reset-password/update`,
        });
        if (error) {
          throw error;
        }

        return {
          status: 'success',
          contactMethod: 'email',
          message: 'Check your inbox for a secure link to finish updating your password.',
        };
      } catch (error) {
        if (error instanceof Error) {
          return { status: 'idle', contactMethod: 'email', error: error.message };
        }
        return { status: 'idle', contactMethod: 'email', error: 'We could not send that reset link. Try again shortly.' };
      }
    }

    const intent = (formData.get('intent') as string | null) ?? '';
    const stage = (formData.get('stage') as string | null) ?? 'request';

    if (intent === 'cancel') {
      return { status: 'idle', contactMethod: 'phone' };
    }

    if (stage === 'verify') {
      const rawPhone = (formData.get('otp_phone') as string | null) ?? (formData.get('phone') as string | null) ?? '';
      const normalizedPhone = normalizePhoneNumber(rawPhone);
      const otpCode = (formData.get('otp_code') as string | null)?.trim();
      const newPassword = (formData.get('new_password') as string | null) ?? '';
      const confirmPassword = (formData.get('confirm_password') as string | null) ?? '';

      if (!normalizedPhone) {
        return { status: 'otp_sent', contactMethod: 'phone', error: 'Enter the phone number we texted the code to.' };
      }

      if (!otpCode || otpCode.length < 4) {
        return {
          status: 'otp_sent',
          contactMethod: 'phone',
          phone: normalizedPhone,
          maskedPhone: maskPhoneNumber(normalizedPhone) ?? normalizedPhone,
          error: 'Enter the 6-digit verification code from your text message.',
        };
      }

      if (newPassword.length < 8) {
        return {
          status: 'otp_sent',
          contactMethod: 'phone',
          phone: normalizedPhone,
          maskedPhone: maskPhoneNumber(normalizedPhone) ?? normalizedPhone,
          error: 'New password must be at least 8 characters.',
        };
      }

      if (newPassword !== confirmPassword) {
        return {
          status: 'otp_sent',
          contactMethod: 'phone',
          phone: normalizedPhone,
          maskedPhone: maskPhoneNumber(normalizedPhone) ?? normalizedPhone,
          error: 'New passwords do not match.',
        };
      }

      try {
        const supa = await createSupabaseServerClient();
        const { error: verifyError } = await supa.auth.verifyOtp({
          phone: normalizedPhone,
          token: otpCode,
          type: 'sms',
        });

        if (verifyError) {
          throw verifyError;
        }

        const { error: updateError } = await supa.auth.updateUser({ password: newPassword });
        if (updateError) {
          throw updateError;
        }

        await supa.auth.signOut();

        return {
          status: 'success',
          contactMethod: 'phone',
          message: 'Password updated. Sign in with your new password.',
        };
      } catch (error) {
        const masked = maskPhoneNumber(normalizedPhone) ?? normalizedPhone;
        if (error instanceof Error) {
          return {
            status: 'otp_sent',
            contactMethod: 'phone',
            phone: normalizedPhone,
            maskedPhone: masked,
            error: error.message,
          };
        }
        return {
          status: 'otp_sent',
          contactMethod: 'phone',
          phone: normalizedPhone,
          maskedPhone: masked,
          error: 'We could not verify that code. Try again.',
        };
      }
    }

    const rawPhone = (formData.get('phone') as string | null) ?? '';
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    if (!normalizedPhone) {
      return {
        status: 'idle',
        contactMethod: 'phone',
        error: 'Enter the phone number linked to your account, including country code.',
      };
    }

    try {
      const supa = await createSupabaseServerClient();
      const { error } = await supa.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: false },
      });

      if (error) {
        throw error;
      }

      return {
        status: 'otp_sent',
        contactMethod: 'phone',
        phone: normalizedPhone,
        maskedPhone: maskPhoneNumber(normalizedPhone) ?? normalizedPhone,
        message: 'We sent a 6-digit verification code to your phone.',
      };
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', contactMethod: 'phone', error: error.message };
      }
      return {
        status: 'idle',
        contactMethod: 'phone',
        error: 'We could not send a verification code. Try again shortly.',
      };
    }
  }

  return <ResetPasswordForm action={resetPassword} initialState={INITIAL_STATE} csrfToken={csrfToken} />;
}

function normalizeContactMethod(value: FormDataEntryValue | null): 'email' | 'phone' {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'phone') {
    return 'phone';
  }
  return 'email';
}
