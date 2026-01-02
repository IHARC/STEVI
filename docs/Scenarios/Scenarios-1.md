# Encounter-first scenarios (Canon)
Last updated: 2026-01-02  
Status: Canon (ground truth for acceptance)

Use these end-to-end scenarios when designing, building, and testing the encounter-first UX.

Related:
- Use cases + user stories: `docs/use-cases.md`
- Client record umbrella roadmap: `docs/client-record-vision-roadmap.md`
- Encounter module roadmap: `docs/encounter-module-vision-roadmap.md`

### 1) Outreach: hand warmers + water; pneumonia disclosed; client exists
- Actor: Outreach worker (field role).
- Flow: From Today/Clients → open client → New Encounter (type Outreach) → add items given (hand warmers, water) → note health concern (pneumonia).
- Outcome: Supplies decremented; Encounter logged to Client Journey; no nav detour into Inventory.

### 2) Drop-in lunch → mental health support; client exists; multiple orgs
- Actor: Salvation Army staff running a program.
- Flow: Programs → Drop-in Lunch roster → open client → New Encounter (program context) → create Referral to mental health partner.
- Outcome: Referral created from client; Partners hub only holds directory/config; consent/sharing indicator visible.

### 3) Library intake (“no wrong door”); new person; limited role
- Actor: Librarian/volunteer with restricted access.
- Flow: Today (role-scoped to Intake) → search or create client → New Encounter (Intake) → add next-step guidance/referral.
- Outcome: Minimal nav, only allowed actions visible; Encounter becomes first Journey entry.

### 4) Outreach nurse + worker; infected wound; vitals + supplies; client exists; global consent
- Actors: Outreach worker + nurse (clinical role).
- Flow: Today/Clients → open client → New Encounter (Outreach) → worker adds notes/context → nurse adds vitals + wound care details → record supplies used.
- Outcome: Single shared Encounter with role-gated panels; consent banner visible; inventory adjusted.

### Canonical rules validated by these scenarios
1) Clients are the spine; Client Journey is canonical.
2) Encounter (formerly “Visit”) is the universal interaction record; all frontline actions happen inside it.
3) Supplies distribution is recorded inside Encounters; Inventory hub is for stock/reconciliation only.
4) Referrals are initiated from the client/Encounter; Partners hub is the directory/config surface.
5) Role-based landing and visibility keep low-tech users focused while preserving one shell.
6) Consent/sharing is a first-class UI signal on Client and every Encounter/Referral.
