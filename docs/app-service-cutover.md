# STEVI → Azure App Service Cutover Plan (Node 24)

Audience: a fresh Codex run / new engineer completing the migration from Azure Static Web Apps (SWA) to Azure App Service (Linux) using Node 24 LTS.

## Current repo state
- GitHub Action `.github/workflows/main_stevi.yml` builds with Node 24.x, prunes dev deps, and deploys the build artifact via publish profile to the `STEVI` Web App (Production slot).
- Runtime expectations: Node 24.x (`package.json` engines, `.nvmrc` 24.11.1, README prerequisite).

## Prerequisites
- Azure resources already created: App Service `STEVI` (Linux, Node 24 LTS). If staging slot exists, prefer using it for validation.
- Secrets in GitHub: `AZUREAPPSERVICE_PUBLISHPROFILE_*` for target slot(s); Supabase and app URLs available (see below).
- Local: `nvm use 24.11.1` and `npm ci` for parity.

## CI/CD shape
- Workflow: `.github/workflows/main_stevi.yml` (push to `main` → Production slot). `workflow_dispatch` accepts `slot` (`Production` or `staging`) and fails fast if a staging publish profile is missing.
- Build pipeline: `npm ci` → `npm run typecheck` → `npm run build` (lint + default Next build using Turbopack) → `npm test --if-present` → `npm prune --omit=dev` → bundle Next **standalone** output (`.next/standalone`, `.next/static`, `public`, package manifests) → zip → deploy with `azure/webapps-deploy@v3`.

## Environment variables to set on App Service
Set in **App Settings** (and in staging slot if used):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (e.g., production hostname)
- `NEXT_PUBLIC_SITE_URL` (marketing hostname)
- Optional: `PORTAL_ALERTS_SECRET`, `NEXT_PUBLIC_ANALYTICS_DISABLED`, `NEXT_PUBLIC_GA4_ID`.

## Deployment flow (recommended)
1) **Staging deploy (safe path)**
   - Add/confirm a staging slot in the App Service.
   - Create a duplicate publish-profile secret for the slot (e.g., `AZUREAPPSERVICE_PUBLISHPROFILE_STAGING`) and deploy with `workflow_dispatch` + `slot: staging` so the workflow picks the staging secret.
   - Trigger the workflow on `main` or `workflow_dispatch`.
2) **Validate on staging**
   - Smoke: `/`, `/login`, one authenticated flow (Supabase session), a write action that logs audit (e.g., profile update), and any upload route if wired.
   - Check Application Insights logs and Live Metrics for errors.
3) **Promote**
   - If using slots: swap staging → production.
   - If no slots: retarget the workflow back to `Production` slot and redeploy from the latest artifact.
4) **DNS (no Front Door)**
   - Point your custom domain CNAME directly to the App Service default hostname.
   - Enable App Service Managed Certificates for HTTPS on the custom hostname. (Optional CDN: you can add later without Front Door.)
5) **Post-cutover checks**
   - Repeat smoke tests in production.
   - Verify `portal-alerts` edge function (if `PORTAL_ALERTS_SECRET` set) still fires.
   - Monitor 5xx and latency alerts (set in App Insights/Alert rules).

## Rollback
- If slots: swap back to staging (old production).
- If single slot: redeploy last known-good artifact from Actions history or temporarily restore the previous App Service snapshot / publish profile artifact.

## Operational differences vs SWA
- **Platform config**: set `WEBSITE_NODE_DEFAULT_VERSION` to Node 24.x, `SCM_DO_BUILD_DURING_DEPLOYMENT=false` (we ship prebuilt artifacts), `WEBSITE_RUN_FROM_PACKAGE` not required.
- **Startup**: App uses Next standalone output; start command is `node .next/standalone/server.js`.
- **Always On / warm**: enable `alwaysOn` to keep the Next.js server warm; configure `ARRAffinity` as needed for sticky sessions (Supabase auth cookies are stateless).
- **Logging/monitoring**: enable App Insights (live metrics + traces), HTTP access logs, and set 5xx/latency alerts. SWA handled this implicitly; App Service requires explicit setup.
- **TLS & domains**: bind custom domains and enable Managed Certificates per hostname (SWA auto-managed).
- **Scaling**: choose plan size/scale-out rules; SWA was serverless. Validate memory/CPU headroom under load tests.

## Notes for future tweaks
- To run Node 25 later, use a custom container on App Service or wait for platform support; update `engines`, `.nvmrc`, and workflow accordingly.
- Keep `npm ci` + `npm prune --omit=dev` in the pipeline to ship lean artifacts.
