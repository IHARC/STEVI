import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createSupabaseAuthRSCClient } from '@/lib/supabase/auth-rsc';
import { createSupabaseAuthServerClient } from '@/lib/supabase/auth-server';
import { normalizePhoneNumber } from '@/lib/phone';
import { getBrandingAssets } from '@/lib/marketing/branding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/ui/card';
import { LoginForm } from '@shared/auth/login-form';
import { Button } from '@shared/ui/button';
import { Separator } from '@shared/ui/separator';

export const dynamic = 'force-dynamic';

type ContactMethod = 'email' | 'phone';

type FormState = {
  error?: string;
  contactMethod?: ContactMethod;
};

type ConsentPageProps = {
  searchParams?: Promise<{ authorization_id?: string | string[]; error?: string | string[] }>;
};

const INITIAL_FORM_STATE: FormState = { contactMethod: 'email' };

export default async function OAuthConsentPage({ searchParams }: ConsentPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawAuthorizationId = resolvedSearchParams?.authorization_id;
  const authorizationId = Array.isArray(rawAuthorizationId) ? rawAuthorizationId[0] : rawAuthorizationId;
  const rawError = resolvedSearchParams?.error;
  const errorCode = Array.isArray(rawError) ? rawError[0] : rawError;

  if (!authorizationId) {
    return <MissingAuthorizationId />;
  }
  const authorizationIdValue = authorizationId;

  const supabase = await createSupabaseAuthRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const branding = await getBrandingAssets();

    async function loginUser(_prevState: FormState, formData: FormData): Promise<FormState> {
      'use server';

      const contactMethod = normalizeContactMethod(formData.get('contact_method'));
      const password = (formData.get('password') as string | null) ?? '';

      if (!password) {
        return { error: 'Enter your password to continue.', contactMethod };
      }

      const supa = await createSupabaseAuthServerClient();

      if (contactMethod === 'email') {
        const email = (formData.get('email') as string | null)?.trim().toLowerCase();
        if (!email) {
          return { error: 'Enter the email you used to register.', contactMethod: 'email' };
        }

        const { error } = await supa.auth.signInWithPassword({ email, password });
        if (error) {
          return { error: error.message, contactMethod: 'email' };
        }

        redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationIdValue)}`);
      }

      const rawPhone = (formData.get('phone') as string | null) ?? '';
      const normalizedPhone = normalizePhoneNumber(rawPhone);
      if (!normalizedPhone) {
        return {
          error: 'Enter the phone number you used to register (include country code).',
          contactMethod: 'phone',
        };
      }

      const { error } = await supa.auth.signInWithPassword({ phone: normalizedPhone, password });
      if (error) {
        return { error: error.message, contactMethod: 'phone' };
      }

      redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationIdValue)}`);
    }

    const initialState: FormState = errorCode
      ? { ...INITIAL_FORM_STATE, error: 'We could not finish signing you in. Please try again.' }
      : INITIAL_FORM_STATE;

    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <Image src={branding.logoLightUrl} alt="STEVI" width={42} height={42} className="rounded-full" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">STEVI</p>
                <p className="text-sm font-semibold text-foreground">Secure sign-in</p>
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold">Sign in to continue</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Authenticate to approve access for this client.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <LoginForm action={loginUser} initialState={initialState} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: detailsData, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  const details = detailsData as AuthorizationDetails | null;

  if (detailsError || !details) {
    return <MissingAuthorizationDetails />;
  }

  const clientIdValue = details.client?.id ?? null;
  const redirectTo = details.redirect_url ?? null;
  const firstPartyClientId = process.env.SUPABASE_OAUTH_CLIENT_ID ?? null;
  const shouldAutoApprove =
    !errorCode && Boolean(firstPartyClientId && clientIdValue && firstPartyClientId === clientIdValue);

  if (!errorCode && redirectTo) {
    redirect(redirectTo);
  }

  if (shouldAutoApprove) {
    const supa = await createSupabaseAuthServerClient();
    const { data, error } = await supa.auth.oauth.approveAuthorization(authorizationIdValue, {
      skipBrowserRedirect: true,
    });

    if (!error && data?.redirect_url) {
      redirect(data.redirect_url);
    }
  }

  async function signOut() {
    'use server';

    const supa = await createSupabaseAuthServerClient();
    await supa.auth.signOut();
    redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationIdValue)}`);
  }

  const clientName = details.client?.name ?? 'Unknown client';
  const clientId = clientIdValue ?? 'Unknown client';
  const scopeList = normalizeScopes(details.scope);
  const identityLabel = user.email ?? user.phone ?? 'Signed-in account';

  async function approveAuthorization(formData: FormData) {
    'use server';

    const rawId = formData.get('authorization_id');
    const id = typeof rawId === 'string' ? rawId : null;
    if (!id) {
      redirect('/oauth/consent?error=missing_authorization_id');
    }

    const supa = await createSupabaseAuthServerClient();
    const { data, error } = await supa.auth.oauth.approveAuthorization(id, {
      skipBrowserRedirect: true,
    });

    if (error || !data?.redirect_url) {
      redirect(`/oauth/consent?authorization_id=${encodeURIComponent(id)}&error=consent_failed`);
    }

    redirect(data.redirect_url);
  }

  async function denyAuthorization(formData: FormData) {
    'use server';

    const rawId = formData.get('authorization_id');
    const id = typeof rawId === 'string' ? rawId : null;
    if (!id) {
      redirect('/oauth/consent?error=missing_authorization_id');
    }

    const supa = await createSupabaseAuthServerClient();
    const { data, error } = await supa.auth.oauth.denyAuthorization(id, {
      skipBrowserRedirect: true,
    });

    if (error || !data?.redirect_url) {
      redirect(`/oauth/consent?authorization_id=${encodeURIComponent(id)}&error=deny_failed`);
    }

    redirect(data.redirect_url);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl font-semibold">Approve access</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {clientName} is requesting access to your STEVI account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorCode ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              We could not finish that request. Please review and try again.
            </div>
          ) : null}

          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client</p>
            <p className="text-base font-semibold text-foreground">{clientName}</p>
            <p className="text-xs text-muted-foreground">Client ID: {clientId}</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signed in as</p>
              <p className="text-sm font-semibold text-foreground">{identityLabel}</p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requested scopes</p>
            {scopeList.length ? (
              <ul className="grid gap-2 text-sm text-foreground">
                {scopeList.map((scope) => (
                  <li key={scope} className="rounded-md border border-border/60 bg-background px-3 py-2">
                    {scope}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No specific scopes were requested.</p>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <form action={denyAuthorization}>
              <input type="hidden" name="authorization_id" value={authorizationId} />
              <Button type="submit" variant="outline" className="w-full sm:w-auto">
                Deny
              </Button>
            </form>
            <form action={approveAuthorization}>
              <input type="hidden" name="authorization_id" value={authorizationId} />
              <Button type="submit" className="w-full sm:w-auto">
                Approve access
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeContactMethod(value: FormDataEntryValue | null): ContactMethod {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'phone') {
    return 'phone';
  }
  return 'email';
}

function normalizeScopes(rawScopes: unknown): string[] {
  if (Array.isArray(rawScopes)) {
    return rawScopes.map(String);
  }

  if (typeof rawScopes === 'string') {
    return rawScopes.split(/\s+/).filter(Boolean);
  }

  return [];
}

type AuthorizationDetails = {
  redirect_url?: string | null;
  scope?: string | null;
  client?: {
    id?: string | null;
    name?: string | null;
    uri?: string | null;
    logo_uri?: string | null;
  } | null;
};


function MissingAuthorizationId() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Missing authorization request</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            This page must be opened from a valid sign-in request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Return to the STEVI app and start the sign-in flow again.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MissingAuthorizationDetails() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Unable to load consent details</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            We could not load this authorization request. Please restart the sign-in flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If this keeps happening, contact the STEVI team.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
