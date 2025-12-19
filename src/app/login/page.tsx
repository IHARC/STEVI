import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LoginForm } from '@shared/auth/login-form';
import { resolveNextPath, parseAuthErrorCode, type AuthErrorCode } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/phone';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import { getBrandingAssets } from '@/lib/marketing/branding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';

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
  const landingPath = resolveLandingPath(portalAccess);

  // Only persist an explicit next param. If none was provided, let post-auth logic
  // choose the right destination (so admins land in /admin instead of /home).
  const nextPath = resolveNextPath(rawNextParam, portalAccess ? landingPath : '');

  if (user) {
    redirect(nextPath || landingPath || '/home');
  }

  const branding = await getBrandingAssets();

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

      const supa = await createSupabaseServerClient();
      const { error } = await supa.auth.signInWithPassword({ email, password });
      if (error) {
        return { error: error.message, contactMethod: 'email' };
      }

      const access = await loadPortalAccess(supa);
      const destination = resolveNextPath(rawNext, resolveLandingPath(access));
      redirect(destination);
    }

    const rawPhone = (formData.get('phone') as string | null) ?? '';
    const normalizedPhone = normalizePhoneNumber(rawPhone);
    if (!normalizedPhone) {
      return {
        error: 'Enter the phone number you used to register (include country code).',
        contactMethod: 'phone',
      };
    }

    const supa = await createSupabaseServerClient();
    const { error } = await supa.auth.signInWithPassword({ phone: normalizedPhone, password });
    if (error) {
      return { error: error.message, contactMethod: 'phone' };
    }

    const access = await loadPortalAccess(supa);
    const destination = resolveNextPath(rawNext, resolveLandingPath(access));
    redirect(destination);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-muted/50 via-background to-card px-6 py-10 text-foreground">
      <div className="w-full max-w-xl">
        <Card className="relative overflow-hidden border-border/60 bg-card shadow-md">
          <div className="h-2 w-full bg-primary" aria-hidden />
          <CardHeader className="gap-2 pb-4 pt-4">
            <div className="flex items-center gap-3">
              <Image
                src={branding.logoLightUrl}
                alt="IHARC"
                width={72}
                height={72}
                priority
                className="h-10 w-auto dark:hidden"
              />
              <Image
                src={branding.logoDarkUrl}
                alt="IHARC"
                width={72}
                height={72}
                priority
                className="hidden h-10 w-auto dark:block"
              />
              <div className="leading-tight">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">STEVI</p>
                <p className="text-base font-semibold text-foreground">Supportive Technology to Enable Vulnerable Individuals</p>
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Welcome back
            </p>
            <CardTitle className="text-2xl font-semibold">Sign in to STEVI</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              IHARC portal for appointments, documents, and outreach updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-3">
            <LoginForm action={loginUser} nextPath={rawNextParam ?? ''} initialState={initialState} />
          </CardContent>
        </Card>
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
