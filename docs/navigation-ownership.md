# Navigation Ownership (Visit-First)

The workspace rail follows the visit-first IA defined in `docs/architecture/encounter-nav-plan.md`. This plan is the single source of truth for navigation, guards, and UX enforcement across the staff/admin/org workspace.

Key references:
- `docs/architecture/encounter-nav-plan.md` – Visit-first rail, gating rules, and testing expectations.
- `src/lib/portal-navigation.ts` – single workspace rail (Today, Clients, Programs, Supplies, Partners, Organization, Reports).
- `src/components/shared/layout/app-navigation.tsx` – rail rendering (desktop/mobile) with preview handling.
- `src/components/shared/layout/top-nav.tsx` – top chrome without workspace mega menu; acting-org indicator.
- `src/lib/client-navigation.ts` – client portal navigation (unchanged).

No legacy multi-rail menus remain. Additions or changes must align with the Visit-first plan; deviations require an ADR.
