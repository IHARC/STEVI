# shadcn/ui Migration + Remediation Plan (No Fallbacks)

Purpose: Equip a fresh Codex run to finish the shadcn/ui cutover, fix the audit gaps, and leave zero legacy styling or components. No dual systems, no backward compatibility.

## Progress snapshot (Dec 6, 2025)
- ✅ Tailwind/theme: custom shadows removed; tokens consolidated in `src/styles/theme.css`.
- ✅ Auth + profile security forms on shadcn `Form`: login, reset/update password, profile contact/password.
- ✅ Admin/org/support forms on shadcn `Form`: inventory items/locations/organizations/receipts dialogs, org settings (contact/notes), support composer sheet, website footer form.
- ✅ Sidebar navigation rebuilt on shadcn `navigation-menu` primitives.
- ✅ Token/docs cleanup: README/agents updated; `docs/design-tokens.md` rewritten for shadcn; Material references removed.
- ✅ Playwright baseline added (`playwright.config.ts`, `playwright/tests/baseline.spec.ts`).
- ✅ Legacy utility cleanup: `tracking-label-uppercase`, `text-error`, `border-error`, `text-warning-foreground` removed where found.
- ✅ Forms migrated to shadcn `Form`: onboarding wizard; all registration flows (client intake/claim, partner, volunteer, community, concern report); appointments request/cancel/reschedule; marketing forms; quick outreach; org invites; documents list; remaining raw forms cleaned.
- ✅ Top navigation (TopNav) rebuilt on `navigation-menu` primitives; bespoke styling removed.
- ⬜ Final sweep for legacy utility classes and any bespoke modals/tables/breadcrumbs outside `@/components/ui`.
- ⬜ Testing: `npm run lint`, `npm run typecheck`, and `npm run test` pass; `npm run e2e` still failing (Playwright worker exits unexpectedly) — needs investigation.

## Repo snapshot
- Global tokens/styles: `src/styles/theme.css` only. No `main.css`, no Material token files.
- Tailwind: `tailwind.config.ts` already points to `src/app`, `src/components`, `src/hooks`, `src/lib`, `src/content` globs.
- UI primitives: generated under `src/components/ui/` with barrel `index.ts`; `Toaster` mounted in `src/app/layout.tsx`.
- ESLint blocks legacy imports (`@/components/ui-legacy/*`, `@/styles/main.css`).

## Pre-flight
1) `npm install`
2) `npm run lint` and `npm run typecheck` (must pass before code changes ship).

## 1) Theme + Tailwind alignment
- Keep tokens in `src/styles/theme.css`; do **not** reintroduce Material token files.
- Normalize Tailwind extensions to shadcn defaults: remove custom `boxShadow` overrides unless matching the shadcn template; keep radius + color variables from `theme.css`.
- Fonts: continue `next/font` in `src/app/layout.tsx` mapping to `--font-sans`/`--font-mono` (and optional heading/body vars).

## 2) Purge legacy utility classes
- Search/replace any Material-era classes with shadcn tokens/utilities:
  - `tracking-label-uppercase` → `tracking-wide uppercase text-xs font-semibold` (or equivalent semantic utility).
  - `text-error`, `border-error`, `text-warning-foreground`, `bg-error*`, etc. → use shadcn semantic colors (`text-destructive`, `text-amber-600`, `border-destructive`, `bg-destructive/10`, etc.) defined in `theme.css`.
- Verify replacements in: `src/components/auth/login-form.tsx`, `src/app/(portal)/profile/page.tsx`, `src/components/admin/inventory/inventory-locations.tsx`, `src/app/(portal)/home/page.tsx`, and any other matches from `rg`.
- After replacements, ensure no custom color names remain; only shadcn token-driven utilities should be used.

## 3) Forms: adopt shadcn `Form`
- Standardize on `@/components/ui/form` + `react-hook-form` for all interactive forms that render client-side UI feedback. Replace raw `<form>`/manual field markup with `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`.
- Prioritize: auth forms (`src/components/auth/login-form.tsx`, reset/update password), onboarding forms, inventory CRUD dialogs, admin/org settings, registration flows.
- Remove dead code if any custom form helpers become unused.

## 4) Navigation shell rebuild
- Rebuild sidebar and top navigation using shadcn primitives:
  - Use `@/components/ui/navigation-menu` for desktop navigation; ensure focus styles match tokens.
  - Mobile nav stays sheet-based but keep Sheet content built from the same navigation-menu data.
- Apply to `src/components/layout/app-navigation.tsx` and `src/components/layout/top-nav.tsx`; remove bespoke `Link` list styling and any legacy scrollbar CSS.

## 5) Overlays & feedback
- Ensure all modals/drawers use shadcn `Dialog`/`Drawer`/`Sheet` components (already present in many files). Confirm no third-party or legacy modal code remains.
- Toasts: keep Sonner Toaster in `src/app/layout.tsx`; all toast calls should come from `@/components/ui/use-toast`.
- Alerts: use `@/components/ui/alert` for inline statuses and empty states.

## 6) Data display widgets
- Tables: all tables should use `@/components/ui/table`. Replace any raw `<table>` markup if found.
- Tabs/Accordion: use shadcn `Tabs`/`Accordion` components only.
- Breadcrumbs: keep `@/components/ui/breadcrumb` in page headers; remove any custom breadcrumb logic elsewhere.
- Charts: keep `ui/chart` composition but ensure it reads colors from CSS vars (already does).

## 7) Tokens & documentation cleanup
- Update `README.md`, `agents.md`, and `docs/design-tokens.md` to remove Material 3 references and clearly state shadcn token usage via `theme.css`.
- Delete any instructions referencing `tokens/material3.json` or `src/styles/main.css`.
- Document the new color/spacing guidance based on the current `theme.css` variables.

## 8) ESLint & guardrails
- Keep the existing `no-restricted-imports` block; extend if new legacy paths surface during cleanup.
- Run `npm run lint` after every migration step; fix violations immediately.

## 9) Testing & visual baselines
- Add Playwright config plus visual snapshot coverage for `/`, `/admin/operations`, and `/login` using shadcn-styled UI. Place tests under `playwright/` with `playwright.config.ts`.
- Ensure Vitest unit tests still pass (`npm run test`).

## 10) Acceptance criteria
- Only `src/styles/theme.css` supplies design tokens. No Material assets or classes remain.
- All UI imports come from `@/components/ui` (or compositions built on them) with navigation rebuilt on `navigation-menu`.
- Forms use shadcn `Form` components; overlays use shadcn `Dialog`/`Drawer`; tables/tabs/accordions/breadcrumbs use shadcn counterparts.
- Lint, typecheck, vitest, and Playwright tests pass without warnings. No backward compatibility shims or legacy CSS.
