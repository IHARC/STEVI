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
    <div className="relative isolate min-h-screen overflow-hidden bg-surface">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(var(--md-sys-color-primary)/0.14),transparent_45%),radial-gradient(circle_at_82%_12%,rgba(var(--md-sys-color-secondary)/0.12),transparent_40%),radial-gradient(circle_at_50%_92%,rgba(var(--md-sys-color-tertiary)/0.08),transparent_42%)]"
        aria-hidden
      />
      <div className="page-shell relative">
        <div className="mx-auto grid w-full max-w-5xl items-start gap-space-xl lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-space-md">
            <div className="inline-flex items-center gap-space-2xs rounded-full border border-outline/12 bg-surface-container-low/80 px-space-sm py-space-2xs text-label-sm font-semibold text-primary shadow-level-1">
              STEVI secure sign-in
            </div>
            <header className="space-y-space-sm">
              <p className="text-label-sm font-semibold uppercase tracking-label-uppercase text-muted-foreground">Client & staff portal</p>
              <h1 className="text-display-sm font-semibold text-on-surface sm:text-display-md">Sign in to STEVI</h1>
              <p className="max-w-2xl text-body-lg text-muted-foreground">
                Manage appointments, documents, and outreach updates securely in one place.
              </p>
            </header>
          </div>

          <div className="w-full max-w-form-md justify-self-end rounded-3xl border border-outline/10 bg-surface-container-high/90 p-space-xl shadow-level-2 backdrop-blur-md">
            <div className="mb-space-md space-y-space-2xs">
              <p className="text-label-sm font-semibold uppercase tracking-label-uppercase text-muted-foreground">Sign in</p>
              <p className="text-title-lg font-semibold text-on-surface">Enter your credentials</p>
              <p className="text-body-sm text-muted-foreground">Use the email or phone number you registered with.</p>
            </div>
            <LoginForm action={loginUser} nextPath={rawNextParam ?? ''} initialState={initialState} />
          </div>
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
