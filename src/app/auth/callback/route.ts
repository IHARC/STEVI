import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { resolveNextPath, type AuthErrorCode } from '@/lib/auth';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveDefaultWorkspacePath } from '@/lib/workspaces';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const providerError = requestUrl.searchParams.get('error');
  const providerErrorDescription = requestUrl.searchParams.get('error_description');
  const flow = requestUrl.searchParams.get('flow') === 'register' ? 'register' : 'login';
  const rawNext = requestUrl.searchParams.get('next') ?? undefined;

  if (!code) {
    const errorCode = mapProviderErrorToCode(providerError, providerErrorDescription);
    return redirectWithError(request, flow, resolveNextPath(rawNext), errorCode);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Google OAuth exchange failed', error);
      return redirectWithError(request, flow, resolveNextPath(rawNext), 'google_auth_error');
    }

    await hydratePortalProfile(supabase);
    const access = await loadPortalAccess(supabase);
    const destination = resolveNextPath(rawNext, resolveDefaultWorkspacePath(access));
    return redirectToPath(request, destination);
  } catch (error) {
    console.error('Unexpected error during Google OAuth exchange', error);
    return redirectWithError(request, flow, resolveNextPath(rawNext), 'google_auth_error');
  }
}

function mapProviderErrorToCode(error: string | null, description: string | null): AuthErrorCode {
  const loweredDescription = description ? description.toLowerCase() : null;

  if (!error && !loweredDescription) {
    return 'google_auth_error';
  }

  if (error === 'access_denied') {
    return 'google_auth_cancelled';
  }

  if (loweredDescription && loweredDescription.includes('access_denied')) {
    return 'google_auth_cancelled';
  }

  return 'google_auth_error';
}

async function hydratePortalProfile(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    if (error) {
      console.error('Unable to load user after Google OAuth exchange', error);
    }
    return;
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const rawName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    (typeof metadata.preferred_username === 'string' && metadata.preferred_username) ||
    (user.email ? user.email.split('@')[0] : null);

  const displayName = rawName?.trim() ? truncate(rawName.trim(), 80) : 'Community Member';
  const avatarUrl = typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null;

  try {
    await ensurePortalProfile(supabase, user.id, {
      display_name: displayName,
      avatar_url: avatarUrl,
    });
  } catch (profileError) {
    console.error('Unable to ensure portal profile after Google sign-in', profileError);
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function getRequestBaseUrl(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const requestUrl = new URL(request.url);
  return `${requestUrl.protocol}//${requestUrl.host}`;
}

function redirectToPath(request: NextRequest, path: string) {
  const baseUrl = getRequestBaseUrl(request);
  const destination = new URL(path, baseUrl);
  return NextResponse.redirect(destination);
}

function redirectWithError(request: NextRequest, flow: 'login' | 'register', nextPath: string, error: AuthErrorCode) {
  const baseUrl = getRequestBaseUrl(request);
  const targetPath = flow === 'register' ? '/register' : '/login';
  const destination = new URL(targetPath, baseUrl);
  destination.searchParams.set('error', error);
  if (nextPath && flow === 'login') {
    destination.searchParams.set('next', nextPath);
  }
  return NextResponse.redirect(destination);
}
