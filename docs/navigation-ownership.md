# Navigation Ownership (Visit-First)

The Operations rail follows the visit-first IA captured in `docs/plan-ops-shell-migration.md` and enforced in `src/lib/portal-navigation.ts`. This is the source of truth for navigation, guards, and UX enforcement across the staff/org/STEVI Admin shell.

Key references:
- `docs/plan-ops-shell-migration.md` – execution plan and naming/area rules.
- `src/lib/portal-navigation.ts` – Operations rails (ops_frontline, ops_org, ops_hq) covering Today, Clients, Programs, Supplies, Partners, Org hub, and STEVI Admin hub. Visit creation is a hub action, not a global hub.
- `src/components/workspace/layout/ops-hub-rail.tsx` – thin ops hub rail (desktop).
- `src/components/shared/layout/app-navigation.tsx` – mobile navigation sheet (hubs-only in ops).
- `src/components/shared/layout/top-nav.tsx` – top chrome without client mega menu when in ops; acting-org switcher hidden in STEVI Admin.
- `src/lib/client-navigation.ts` – client portal navigation (unchanged).

No legacy multi-rail menus remain. Additions or changes must align with the Visit-first plan; deviations require an ADR.
