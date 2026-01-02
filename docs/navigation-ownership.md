# Navigation Ownership (Encounter-First)
Last updated: 2026-01-02  
Status: Working reference (expect frequent edits)

The Operations rail follows the **encounter-first** information architecture (formerly described as “visit-first”) and is enforced in `src/lib/portal-navigation.ts`. This is the source of truth for navigation, guards, and UX enforcement across the staff/org shell.

Key references:
- `docs/ui-standards.md` – app‑wide UI standards, including canonical hub `view` params.
- `src/lib/portal-navigation.ts` – Operations rails (ops_frontline) covering Today, Clients, Programs, Inventory, Fundraising, and Organizations. Encounter creation is a hub action, not a global hub.
- Organization administration is consolidated into the org detail surface at `/ops/organizations/[id]` (tabs via `?tab=...`), and is role-gated there.
- App Admin navigation is owned by `src/app/(app-admin)/app-admin/layout.tsx` (settings shell nav groups).
- `src/components/workspace/layout/ops-hub-rail.tsx` – thin ops hub rail (desktop).
- `src/components/shared/layout/app-navigation.tsx` – mobile navigation sheet (hubs + sub‑pages in ops).
- `src/components/shared/layout/top-nav.tsx` – top chrome without client mega menu when in ops; acting-org switcher shown in ops.
- `src/lib/client-navigation.ts` – client portal navigation (unchanged).

No legacy multi-rail menus remain. Additions or changes must align with the encounter-first plan and `view`‑param conventions; deviations require an ADR.
