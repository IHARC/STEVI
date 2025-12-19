# UI Standards (App‑Wide)

> **Pre‑production rule:** no back‑compat, no fallbacks. All UI and routes must use the current patterns and canonical URLs.

## Navigation & Routing
- **Ops hub registry:** `src/lib/portal-navigation.ts` is the source of truth.
- **Canonical hub views:** use the `view` query param for hub sub‑pages (`/ops/clients?view=directory`, `/ops/programs?view=overview`, `/ops/inventory?view=dashboard`).
  - Enforce canonical values with `normalizeEnumParam` + `toSearchParams` from `src/lib/search-params.ts`.
  - Do **not** accept missing or alternate params.
- **`tab` is reserved for in‑page state**, not hub routing (e.g., tabs inside detail pages).
- **Parity across breakpoints:** mobile navigation must show hubs **and** hub sub‑pages (no hubs‑only sheets).
- **Local navigation:** use `PageTabNav` for routed view switches; use `Tabs` only for non‑routing UI state.

## Tokens & Components
- **Shadcn tokens only:** all primitives consume `src/styles/theme.css`.
- **Ops palette:** red/black/white with neutral grays (see `src/styles/theme.ops.css`).
  - Red = primary CTA or indicator, **not** full‑surface alerts.
  - Accent/hover surfaces are neutral.
- **Components:** use `@shared/ui/*` primitives; avoid bespoke styling.

## Layout & Density
- **Shells:** `@client/client-shell` for client, `@workspace/shells/app-shell` for ops, `SettingsShell` for admin.
- **Width:** forms should cap to readable widths; data tables can be full‑width.
- **Touch targets:** maintain minimum 44px targets for primary nav.

## Accessibility
- Keep focus rings visible on all interactive elements.
- Avoid `text-xs` for critical labels; prefer `text-sm` in nav/UI chrome.
- Ensure color contrast meets WCAG AA for nav, labels, and body text.
