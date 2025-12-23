import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { resolveNextPath } from '@/lib/auth';
import { loadPortalAccess } from '@/lib/portal-access';
import { resolveLandingPath } from '@/lib/portal-navigation';
import {
  clearOAuthFlowCookies,
  clearOAuthSessionCookies,
  exchangeCodeForTokens,
  readOAuthFlowCookies,
  setOAuthSessionCookies,
} from '@/lib/supabase/oauth';
import { buildAbsoluteUrl, getAppUrl } from '@/lib/host';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const oauthError = requestUrl.searchParams.get('error');

  const { state: storedState, codeVerifier, nextPath } = readOAuthFlowCookies(request.cookies);

  if (oauthError || !code || !state) {
    return redirectWithError('oauth_authorize_error');
  }

  if (!storedState || storedState !== state || !codeVerifier) {
    return redirectWithError('oauth_state_mismatch');
  }

  try {
    const tokens = await exchangeCodeForTokens({ code, codeVerifier });
    const supabase = await createSupabaseServerClient(tokens.access_token);
    const access = await loadPortalAccess(supabase);
    const destination = resolveNextPath(nextPath ?? undefined, resolveLandingPath(access));

    const response = NextResponse.redirect(buildAbsoluteUrl(getAppUrl(), destination));
    setOAuthSessionCookies(response.cookies, tokens);
    clearOAuthFlowCookies(response.cookies);
    return response;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('OAuth token exchange failed', error);
    }
    return redirectWithError('oauth_token_error');
  }
}

function redirectWithError(code: string) {
  const response = NextResponse.redirect(buildAbsoluteUrl(getAppUrl(), `/auth/error?code=${encodeURIComponent(code)}`));
  clearOAuthFlowCookies(response.cookies);
  clearOAuthSessionCookies(response.cookies);
  return response;
}
