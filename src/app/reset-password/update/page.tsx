import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  UpdateRecoveredPasswordForm,
  type UpdateRecoveredPasswordState,
} from '@shared/auth/update-password-form';

export const dynamic = 'force-dynamic';

const INITIAL_STATE: UpdateRecoveredPasswordState = { status: 'idle' };

type UpdateResult = UpdateRecoveredPasswordState;

export default async function ResetPasswordUpdatePage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?error=reset_session');
  }

  async function finalizePasswordReset(
    _prevState: UpdateRecoveredPasswordState,
    formData: FormData,
  ): Promise<UpdateResult> {
    'use server';

    const supa = await createSupabaseServerClient();
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser();

    if (!currentUser) {
      return { status: 'idle', error: 'This recovery link has expired. Request a new reset link.' };
    }

    const newPassword = (formData.get('new_password') as string | null) ?? '';
    const confirmPassword = (formData.get('confirm_password') as string | null) ?? '';

    if (newPassword.length < 8) {
      return { status: 'idle', error: 'New password must be at least 8 characters.' };
    }

    if (newPassword !== confirmPassword) {
      return { status: 'idle', error: 'New passwords do not match.' };
    }

    try {
      const { error } = await supa.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }

      await supa.auth.signOut();

      return {
        status: 'success',
        message: 'Password updated. You can now sign in with your new password.',
      };
    } catch (error) {
      if (error instanceof Error) {
        return { status: 'idle', error: error.message };
      }
      return { status: 'idle', error: 'We could not update your password right now.' };
    }
  }

  return <UpdateRecoveredPasswordForm action={finalizePasswordReset} initialState={INITIAL_STATE} />;
}
