import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/auth/login-form';
import { resolveNextPath, parseAuthErrorCode, type AuthErrorCode } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/phone';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export const dynamic = 'force-dynamic';

type ContactMethod = 'email' | 'phone';

type FormState = {
  error?: string;
  contactMethod?: ContactMethod;
};

type SearchParams = Record<string, string | string[]>;

type LoginPageProps = {
  searchParams?: Promise<SearchParams>;
};

const INITIAL_FORM_STATE: FormState = {
  contactMethod: 'email',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawNextParam = Array.isArray(resolvedSearchParams?.next)
    ? resolvedSearchParams?.next[0]
    : resolvedSearchParams?.next;
  const authErrorCode = parseAuthErrorCode(resolvedSearchParams?.error);
  const initialError = authErrorCode ? getAuthErrorMessage(authErrorCode) : null;

  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const portalAccess = user ? await loadPortalAccess(supabase) : null;
  const defaultWorkspacePath = resolveDefaultWorkspacePath(portalAccess);

  // Only persist an explicit next param. If none was provided, let post-auth logic
  // choose the right workspace (so admins land in /admin instead of /home).
  const nextPath = resolveNextPath(rawNextParam, portalAccess ? defaultWorkspacePath : '');

  if (user) {
    redirect(nextPath || defaultWorkspacePath || '/home');
  }

  const initialState: FormState = initialError
    ? { ...INITIAL_FORM_STATE, error: initialError }
    : INITIAL_FORM_STATE;

  async function loginUser(_prevState: FormState, formData: FormData): Promise<FormState> {
    'use server';

    const rawNext = (formData.get('next') as string | null) ?? undefined;
    const contactMethod = normalizeContactMethod(formData.get('contact_method'));
    const password = (formData.get('password') as string | null) ?? '';

    if (!password) {
      return { error: 'Enter your password to continue.', contactMethod };
    }

    if (contactMethod === 'email') {
      const email = (formData.get('email') as string | null)?.trim().toLowerCase();
      if (!email) {
        return { error: 'Enter the email you used to register.', contactMethod: 'email' };
      }

      try {
        const supa = await createSupabaseServerClient();
        const { error } = await supa.auth.signInWithPassword({ email, password });
        if (error) {
          return { error: error.message, contactMethod: 'email' };
        }

        const access = await loadPortalAccess(supa);
        const destination = resolveNextPath(rawNext, resolveDefaultWorkspacePath(access));
        redirect(destination);
      } catch (error) {
        if (error instanceof Error) {
          return { error: error.message, contactMethod: 'email' };
        }
        return { error: 'Unable to sign you in right now.', contactMethod: 'email' };
      }
    }

    const rawPhone = (formData.get('phone') as string | null) ?? '';
    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      return {
        error: 'Enter the phone number you used to register (include country code).',
        contactMethod: 'phone',
      };
    }

    try {
      const supa = await createSupabaseServerClient();
      const { error } = await supa.auth.signInWithPassword({ phone: normalizedPhone, password });
      if (error) {
        return { error: error.message, contactMethod: 'phone' };
      }

      const access = await loadPortalAccess(supa);
      const destination = resolveNextPath(rawNext, resolveDefaultWorkspacePath(access));
      redirect(destination);
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message, contactMethod: 'phone' };
      }
      return { error: 'Unable to sign you in right now.', contactMethod: 'phone' };
    }
  }

  return (
    <div className="min-h-screen bg-surface px-space-md py-space-3xl">
      <div className="mx-auto w-full max-w-form-lg space-y-space-lg">
        <header className="space-y-space-2xs text-center">
          <p className="text-label-sm font-semibold uppercase tracking-label-uppercase text-muted-foreground">Secure sign-in</p>
          <h1 className="text-headline-lg font-semibold text-on-surface sm:text-display-sm">Welcome back to STEVI</h1>
          <p className="text-body-md text-muted-foreground">
            Sign in to manage outreach updates, appointments, documents, and resources — all in one place.
          </p>
        </header>
        <div className="rounded-3xl border border-outline/12 bg-surface-container-high p-space-lg shadow-level-1">
          <LoginForm action={loginUser} nextPath={rawNextParam ?? ''} initialState={initialState} />
        </div>
      </div>
    </div>
  );
}

function getAuthErrorMessage(code: AuthErrorCode): string {
  switch (code) {
    case 'google_auth_cancelled':
      return 'Google sign-in was cancelled. Try again when you are ready.';
    case 'google_auth_error':
    default:
      return 'We could not connect to Google right now. Please try again.';
  }
}

function normalizeContactMethod(value: FormDataEntryValue | null): ContactMethod {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'phone') {
    return 'phone';
  }
  return 'email';
}
