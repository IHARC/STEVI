import { NextRequest, NextResponse } from 'next/server';
import { buildAuthorizeUrl, createPkcePair, createState, setOAuthFlowCookies } from '@/lib/supabase/oauth';
import { resolveNextPath } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const rawNext = requestUrl.searchParams.get('next') ?? undefined;
  const nextPath = resolveNextPath(rawNext, '/home');
  const state = createState();
  const { codeVerifier, codeChallenge } = createPkcePair();

  const authorizeUrl = buildAuthorizeUrl({ state, codeChallenge });
  const response = NextResponse.redirect(authorizeUrl);

  setOAuthFlowCookies(response.cookies, {
    state,
    codeVerifier,
    nextPath,
  });

  return response;
}
