# Navigation Ownership (Visit-First)

The Operations rail follows the visit-first IA captured in `plan.md` and enforced in `src/lib/portal-navigation.ts`. This is the source of truth for navigation, guards, and UX enforcement across the staff/org/STEVI Admin shell.

Key references:
- `plan.md` – current ops navigation IA decisions and open questions.
- `src/lib/portal-navigation.ts` – Operations rails (ops_frontline, ops_org, ops_hq) covering Today, Clients, Programs, Supplies, Partners, Org hub, and STEVI Admin hub. Visit creation is a hub action, not a global hub.
- Org Hub is treated as a top-level hub only for org-scoped users; IHARC admins reach it from STEVI Admin.
- `src/components/workspace/layout/ops-hub-rail.tsx` – thin ops hub rail (desktop).
- `src/components/shared/layout/app-navigation.tsx` – mobile navigation sheet (hubs-only in ops).
- `src/components/shared/layout/top-nav.tsx` – top chrome without client mega menu when in ops; acting-org switcher hidden in STEVI Admin.
- `src/lib/client-navigation.ts` – client portal navigation (unchanged).

No legacy multi-rail menus remain. Additions or changes must align with the Visit-first plan; deviations require an ADR.
