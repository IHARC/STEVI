# Navigation Ownership (Visit-First)

The Operations rail follows the visit-first IA captured in `docs/plan-ops-shell-migration.md` and enforced in `src/lib/portal-navigation.ts`. This is the source of truth for navigation, guards, and UX enforcement across the staff/org/HQ shell.

Key references:
- `docs/plan-ops-shell-migration.md` – execution plan and naming/area rules.
- `src/lib/portal-navigation.ts` – Operations rails (ops_frontline, ops_org, ops_hq) covering Today, Clients, Programs, Visits, Supplies, Partners, Org hub, and HQ hub.
- `src/components/shared/layout/app-navigation.tsx` – rail rendering (desktop/mobile) with preview handling.
- `src/components/shared/layout/top-nav.tsx` – top chrome without client mega menu when in ops; acting-org indicator hidden on HQ.
- `src/lib/client-navigation.ts` – client portal navigation (unchanged).

No legacy multi-rail menus remain. Additions or changes must align with the Visit-first plan; deviations require an ADR.
