import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LoginForm } from '@/components/auth/login-form';
import { resolveNextPath, parseAuthErrorCode, type AuthErrorCode } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/phone';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="relative isolate min-h-screen overflow-hidden bg-surface text-on-surface">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(var(--md-sys-color-primary)/0.18),transparent_42%),radial-gradient(circle_at_82%_12%,rgba(34,90,126,0.14),transparent_38%),radial-gradient(circle_at_48%_92%,rgba(36,36,42,0.12),transparent_38%)]" aria-hidden />
      <div className="page-shell relative">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-space-xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-space-lg">
            <PageHeader
              eyebrow="STEVI secure sign-in"
              title="Sign in to STEVI"
              description="Access appointments, documents, outreach updates, and staff tooling in one calm, secure space."
              padded
            />
            <div className="grid gap-space-sm sm:grid-cols-2 lg:max-w-4xl">
              {[
                {
                  title: 'Appointments & outreach',
                  body: 'Request, reschedule, and keep two-way updates with IHARC staff.',
                },
                {
                  title: 'Documents & consents',
                  body: 'Review agreements, share files, and control privacy preferences.',
                },
                {
                  title: 'Staff & admin tools',
                  body: 'Caseloads, intake, notifications, and inventory for authorized roles.',
                },
                {
                  title: 'Built for accessibility',
                  body: 'WCAG-friendly, trauma-informed flows with clear focus and spacing.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-outline/12 bg-surface-container-low p-space-md shadow-level-1"
                >
                  <p className="text-title-sm font-semibold text-on-surface">{item.title}</p>
                  <p className="mt-space-2xs text-body-sm text-muted-foreground">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="w-full max-w-form-md justify-self-end border-outline/12 bg-surface-container-high shadow-level-2 backdrop-blur-md">
            <CardHeader className="gap-space-2xs pb-space-sm">
              <CardTitle className="text-title-lg">Enter your credentials</CardTitle>
              <CardDescription className="text-body-sm text-muted-foreground">
                Use the email or phone number you registered with.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-space-xs">
              <LoginForm action={loginUser} nextPath={rawNextParam ?? ''} initialState={initialState} />
            </CardContent>
          </Card>
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
