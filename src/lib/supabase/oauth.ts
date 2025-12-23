import { createHash, randomBytes } from 'crypto';
import { getSupabaseEnv } from '@/lib/supabase/config';
import { getAppUrl } from '@/lib/host';

const DEFAULT_SCOPE = 'openid email profile phone';
const STATE_COOKIE = 'stevi_oauth_state';
const VERIFIER_COOKIE = 'stevi_oauth_code_verifier';
const NEXT_COOKIE = 'stevi_oauth_next';
const ACCESS_COOKIE = 'stevi_oauth_access_token';
const REFRESH_COOKIE = 'stevi_oauth_refresh_token';
const EXPIRES_COOKIE = 'stevi_oauth_expires_at';

const FLOW_COOKIE_MAX_AGE = 10 * 60; // 10 minutes
const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

export type OAuthConfig = {
  clientId: string;
  redirectUri: string;
  scopes: string;
  authorizeUrl: string;
  tokenUrl: string;
};

export type OAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
};

type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  path?: string;
  maxAge?: number;
};

type CookieGetter = {
  get(name: string): { value: string } | undefined;
};

type CookieSetter = {
  set(cookie: CookieOptions & { name: string; value: string }): void;
};

export function getOAuthConfig(): OAuthConfig {
  const { url } = getSupabaseEnv();
  const clientId = process.env.SUPABASE_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing SUPABASE_OAUTH_CLIENT_ID.');
  }

  const redirectUri = process.env.SUPABASE_OAUTH_REDIRECT_URI ?? `${getAppUrl()}/auth/callback`;
  const scopes = process.env.SUPABASE_OAUTH_SCOPES ?? DEFAULT_SCOPE;
  const baseUrl = url.replace(/\/$/, '');

  return {
    clientId,
    redirectUri,
    scopes,
    authorizeUrl: `${baseUrl}/auth/v1/oauth/authorize`,
    tokenUrl: `${baseUrl}/auth/v1/oauth/token`,
  };
}

export function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
}): string {
  const config = getOAuthConfig();
  const search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    state: params.state,
    scope: config.scopes,
  });
  return `${config.authorizeUrl}?${search.toString()}`;
}

export function createPkcePair() {
  const codeVerifier = base64UrlEncode(randomBytes(32));
  const codeChallenge = base64UrlEncode(createHash('sha256').update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function createState(): string {
  return base64UrlEncode(randomBytes(16));
}

export function setOAuthFlowCookies(store: CookieSetter, payload: {
  state: string;
  codeVerifier: string;
  nextPath: string | null;
}) {
  const options = baseCookieOptions();
  store.set({ name: STATE_COOKIE, value: payload.state, ...options, maxAge: FLOW_COOKIE_MAX_AGE });
  store.set({ name: VERIFIER_COOKIE, value: payload.codeVerifier, ...options, maxAge: FLOW_COOKIE_MAX_AGE });

  if (payload.nextPath) {
    store.set({ name: NEXT_COOKIE, value: payload.nextPath, ...options, maxAge: FLOW_COOKIE_MAX_AGE });
  } else {
    store.set({ name: NEXT_COOKIE, value: '', ...options, maxAge: 0 });
  }
}

export function clearOAuthFlowCookies(store: CookieSetter) {
  const options = baseCookieOptions();
  store.set({ name: STATE_COOKIE, value: '', ...options, maxAge: 0 });
  store.set({ name: VERIFIER_COOKIE, value: '', ...options, maxAge: 0 });
  store.set({ name: NEXT_COOKIE, value: '', ...options, maxAge: 0 });
}

export function readOAuthFlowCookies(store: CookieGetter) {
  return {
    state: store.get(STATE_COOKIE)?.value ?? null,
    codeVerifier: store.get(VERIFIER_COOKIE)?.value ?? null,
    nextPath: store.get(NEXT_COOKIE)?.value ?? null,
  };
}

export function setOAuthSessionCookies(store: CookieSetter, tokens: OAuthTokens, fallbackRefreshToken?: string | null) {
  const options = baseCookieOptions();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + tokens.expires_in;
  const refreshToken = tokens.refresh_token ?? fallbackRefreshToken ?? null;

  if (!refreshToken) {
    throw new Error('Missing refresh token for OAuth session cookies.');
  }

  store.set({ name: ACCESS_COOKIE, value: tokens.access_token, ...options, maxAge: tokens.expires_in });
  store.set({ name: REFRESH_COOKIE, value: refreshToken, ...options, maxAge: REFRESH_COOKIE_MAX_AGE });
  store.set({ name: EXPIRES_COOKIE, value: String(expiresAt), ...options, maxAge: REFRESH_COOKIE_MAX_AGE });
}

export function clearOAuthSessionCookies(store: CookieSetter) {
  const options = baseCookieOptions();
  store.set({ name: ACCESS_COOKIE, value: '', ...options, maxAge: 0 });
  store.set({ name: REFRESH_COOKIE, value: '', ...options, maxAge: 0 });
  store.set({ name: EXPIRES_COOKIE, value: '', ...options, maxAge: 0 });
}

export function readOAuthSessionCookies(store: CookieGetter) {
  const accessToken = store.get(ACCESS_COOKIE)?.value ?? null;
  const refreshToken = store.get(REFRESH_COOKIE)?.value ?? null;
  const expiresAtRaw = store.get(EXPIRES_COOKIE)?.value ?? null;
  const expiresAt = expiresAtRaw ? Number.parseInt(expiresAtRaw, 10) : null;

  return { accessToken, refreshToken, expiresAt };
}

export function shouldRefreshToken(expiresAt: number | null): boolean {
  if (!expiresAt) return true;
  const now = Math.floor(Date.now() / 1000);
  return expiresAt - now <= TOKEN_REFRESH_BUFFER_SECONDS;
}

export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
}): Promise<OAuthTokens> {
  const config = getOAuthConfig();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    code_verifier: params.codeVerifier,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await safeReadText(response);
    throw new Error(`OAuth token exchange failed: ${response.status} ${errorBody}`);
  }

  return (await response.json()) as OAuthTokens;
}

export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const config = getOAuthConfig();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.clientId,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await safeReadText(response);
    throw new Error(`OAuth refresh failed: ${response.status} ${errorBody}`);
  }

  const payload = (await response.json()) as OAuthTokens;
  if (!payload.refresh_token) {
    payload.refresh_token = refreshToken;
  }
  return payload;
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
