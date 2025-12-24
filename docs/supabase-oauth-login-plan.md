# STEVI: Supabase OAuth Server Plan (login.iharc.ca)

Status: draft (iterative)
Owner: IHARC / STEVI
Last updated: 2025-12-23

## Progress tracker
- [ ] Phase 1: Supabase OAuth server configuration (dashboard work pending)
- [x] Phase 2: `login.iharc.ca` authorization UI + consent
- [x] Phase 3: `stevi.iharc.ca` OAuth client + callback
- [x] Phase 4: Session hardening + cookie strategy
- [~] Phase 5: Rollout plan (staging → production) — infra in progress (Azure/DNS)

## 1) Decision summary
- App stays on `https://stevi.iharc.ca`.
- New login + consent flow will live at `https://login.iharc.ca`.
- Use Supabase OAuth 2.1 Server (public beta) as the authorization server.
- Dedicated consent screen is required, especially for external/partner clients.
- First-party clients auto-approve consent; the consent UI is reserved for third-party clients or error recovery.
- OAuth flow: Authorization Code + PKCE.

## 2) Goals
- Centralize login and consent on `login.iharc.ca` without sharing cookies across subdomains.
- Support multiple clients (web, mobile, partner apps) with standard OAuth/OIDC flows.
- Preserve Supabase RLS + JWT-based access control for APIs and data access.
- Provide a clear, auditable consent experience for client access.

## 3) Non-goals
- No cross-subdomain shared cookies (avoid parent-domain session cookies).
- No password or client_credentials grants for third parties.
- No reduction in security posture to simplify implementation.

## 4) Architecture overview

Client (app):
- `https://stevi.iharc.ca` is an OAuth client.
- It redirects users to Supabase OAuth authorization endpoint.
- On callback, it exchanges code + PKCE verifier for tokens.

Authorization UI:
- `https://login.iharc.ca/oauth/consent`
- Handles sign-in (Supabase Auth) and consent approval/denial.
- Uses `authorization_id` to fetch authorization details.

Authorization Server:
- Supabase OAuth 2.1 Server enabled in project.

## 5) Supabase configuration (Phase 1)
1) Enable OAuth 2.1 Server in Supabase dashboard.
2) Set Site URL to `https://login.iharc.ca`.
3) Set Authorization Path to `/oauth/consent`.
4) Switch JWT signing to RS256 or ES256 to support OIDC (`openid` scope).
5) Register OAuth client(s):
   - Client: `stevi-web`
   - Redirect URI: `https://stevi.iharc.ca/auth/callback`
   - Allowed scopes: `openid email profile phone` (adjust as needed)
6) Capture key endpoints:
   - Authorize: `https://<project>.supabase.co/auth/v1/oauth/authorize`
   - Token: `https://<project>.supabase.co/auth/v1/oauth/token`
   - JWKS: `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`
   - OAuth server discovery: `https://<project>.supabase.co/.well-known/oauth-authorization-server/auth/v1`
   - OIDC discovery: `https://<project>.supabase.co/auth/v1/.well-known/openid-configuration`

## 6) Build `login.iharc.ca` authorization UI (Phase 2)
Routes:
- `GET /oauth/consent?authorization_id=...`
- `POST /oauth/consent` (approve/deny)

Server flow (pseudo):
1) Read `authorization_id` from query.
2) Call `supabase.auth.oauth.getAuthorizationDetails(authorization_id)`.
3) If user not logged in, redirect to login (email/password, magic link, etc.).
4) Show consent screen (client name, requested scopes, data summary).
5) On approve: `supabase.auth.oauth.approveAuthorization(...)`.
6) On deny: `supabase.auth.oauth.denyAuthorization(...)`.
7) Redirect to `redirect_to` returned by Supabase.

Consent screen requirements:
- Display client name and requested scopes.
- Explain what data/actions are granted.
- Provide explicit approve/deny actions.
- Log consent decisions (audit trail).

## 7) Implement OAuth client in `stevi.iharc.ca` (Phase 3)
Callback route:
- `GET /auth/callback`

Flow:
1) Create PKCE challenge + verifier.
2) Redirect user to authorize endpoint with:
   - `client_id`, `redirect_uri`, `response_type=code`, `code_challenge`, `code_challenge_method=S256`, `state`, `scope`.
3) On callback, validate `state` and exchange `code` for tokens at token endpoint.
4) Store access token (and refresh token) server-side, or in secure cookie if needed.
5) Use access token for Supabase calls; RLS applies.

Refresh:
- Use refresh token to obtain new access tokens when expired.

## 8) Security hardening (Phase 4)
- Keep app session cookies host-only (no Domain attribute).
- Use `Secure`, `HttpOnly`, `SameSite=Lax/Strict` as appropriate.
- Enforce HTTPS + HSTS on both `login.iharc.ca` and `stevi.iharc.ca`.
- Consider CSRF protection on consent actions.
- Limit OAuth scopes to minimum necessary.

## 9) Rollout plan (Phase 5)
Staging:
- Configure OAuth server in staging Supabase project.
- Implement login UI + consent screen.
- Run end-to-end tests (login, consent, refresh, RLS).

Production:
- Enable OAuth server and JWT signing migration.
- Register production OAuth client.
- Deploy `login.iharc.ca` app.
- Deploy `stevi.iharc.ca` OAuth client + callback.
- Canary rollout, monitor error rates, rollback plan.

### Infra status (2025-12-23)
- Created Azure App Service `STEVI-LOGIN` on the existing `IHARC-Linux` plan.
- DNS CNAME created: `login.iharc.ca` → `stevi-login.azurewebsites.net`.
- Hostname binding added for `login.iharc.ca`.
- HTTPS-only enabled and managed SSL certificate bound (SNI).

## 10) Decision: use OpenID tokens?
Recommendation: **Yes** if you anticipate external clients, third-party integrations, or multiple first‑party apps.
- OIDC provides standardized identity assertions (ID token + discovery endpoints).
- It makes client integrations and future partner access cleaner.
- Requires asymmetric JWT signing (RS256/ES256), which we already plan to enable.
If the system remains a single internal web app only, OIDC is optional.

## 11) Risks and mitigations
- Beta status: keep rollback path to current login and monitor Supabase release notes.
- OAuth client implementation complexity: build automated integration tests for the auth flow.
- JWT signing migration: verify existing integrations and RLS policy behavior.

## 12) Open questions
- Which additional clients are planned in the next 12–24 months?
- Which scopes are truly required today?
