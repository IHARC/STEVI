# STEVI Registration & Intake Backend

This document outlines how the new registration flows persist data, how to inspect or action submissions, and how future UI work (especially staff tooling) should integrate with the backend.

## Shared Schema

All public-facing registration flows now write to `portal.registration_flows`. The table enables one place to review intakes, claims, partner applications, and volunteer interest without adding new schemas.

| Column | Notes |
| --- | --- |
| `flow_type` | One of `client_intake`, `client_claim`, `community_registration`, `partner_application`, `volunteer_application`, `concern_report`. |
| `status` | `pending`, `submitted`, `claimed`, or any staff-defined status. Client flows default to `submitted`; partner/volunteer start as `pending`. |
| `portal_code` | 8-digit tracking code. Generated for every record so staff can look up by code during in-person support. |
| `contact_email` / `contact_phone` | Optional contact details. Phone numbers are normalized (`+1XXXXXXXXXX`). |
| `metadata` | `jsonb` payload with flow-specific fields (e.g., intake demographics, concern descriptions, partner program notes). Always strip `null` values before rendering. |
| `supabase_user_id` | Present when an account was created. `profile_id` is filled if a portal profile already exists. |
| `claimed_at` | Populated when an intake is successfully linked to a Supabase user via `portal.claim_registration_flow`. |

### Policies & Access

* Inserts are allowed for anonymous users, but update/delete is limited to admins and moderators through `portal.current_role_in`.
* Staff tools should filter by `flow_type` and `status`, then display the `metadata` payload with plain-language labels.
* When approving partner applications, remember to:
  1. Update the user’s profile (`affiliation_status = 'approved'`, `role = 'org_rep'` or similar).
  2. Remove/adjust any temporary `registration_flows` metadata so it is clear the request was processed.

## Client Intake

Route: `/register/get-help`

* Stores the intake with `flow_type = 'client_intake'`.
* Generates a tracking code even when the person creates an account so staff can pull up the record quickly.
* The `metadata` object includes `contact_choice`, `contact_window`, and `additional_context`. Optional demographics (DOB month/year, postal code, Indigenous identity, disability, gender identity) are stored in dedicated columns.
* When the visitor has a session immediately (i.e., Supabase email confirmations disabled), the action creates a portal profile (`ensurePortalProfile`) and redirects to the requested page.
* When Supabase requires email/phone confirmation, the intake is still stored and the user sees a message to verify their account. Staff can later link the record via the claim flow.

## Existing Client Claim

Route: `/register/access-services`

1. Creates a Supabase account using the supplied email or phone.
2. Attempt to link the intake record by calling the security-definer function:
   ```sql
   select * from portal.claim_registration_flow(
     p_portal_code := '12345678',
     p_chosen_name := 'Jordan',
     p_date_of_birth_month := 3,
     p_date_of_birth_year := 1992,
     p_contact_email := 'jordan@example.ca',
     p_contact_phone := '+16470000000'
   );
   ```
3. The function:
   * Requires the caller to be authenticated (`auth.uid()` must match the new user).
   * Verifies at least two identifiers (code, name + DOB, email, phone).
   * Updates the matching `client_intake` row and logs to `portal.audit_log`.

If the user cannot complete the claim immediately (no active session after sign-up), the submission is stored with `flow_type = 'client_claim'`. Staff should build tooling to surface these pending claims and run `claim_registration_flow` after confirming the user’s identity.

## Community Member Registration

Route: `/register/community-member`

* Creates an account + profile (`affiliation_type = 'community_member'`).
* Stores the submission with `flow_type = 'community_registration'` and captures a boolean `metadata.consent_updates`.
* Staff tooling can use this table to audit unsubscribes or re-send welcome content.

## Partner Applications

Route: `/register/partner`

* Collects agency details and the requestor’s role.
* Accounts are created immediately (email + password); profiles are seeded with `affiliation_status = 'pending'` and `requested_organization_name`.
* `metadata` includes `role_title`, `programs_supported`, `data_requirements`, and `consent_notifications`.
* After review, staff should update the corresponding profile, grant the appropriate permissions/roles, and mark the row’s `status` (e.g., `approved`, `declined`) for audit purposes.

## Volunteer Applications

Route: `/register/volunteer`

* Similar to community registrations but stores volunteer-specific metadata: `pronouns`, `interests`, `availability`, `consent_screening`.
* Profiles default to `affiliation_type = 'community_member'` with `position_title = 'Volunteer applicant'`.
* Staff can update `status` to reflect screening progress and schedule orientation using the stored contact info.

## Concern / Feedback Flow

Route: `/register/report-concern`

* No authentication required.
* Generates a tracking code and stores the report with `flow_type = 'concern_report'`.
* `metadata` captures `category`, `description`, `location`, `additional_details`, and `contact_preference`.
* Contact info is optional:
  * Anonymous reports still receive a tracking code.
  * Email/phone submissions store contact details so notifications can be sent through existing messaging pipelines.

### Building Staff Views

1. Filter: `select * from portal.registration_flows where flow_type = 'concern_report' order by created_at desc limit 50`.
2. Respect contact preferences before sending updates. If `consent_contact = false`, only update stats dashboards.
3. Consider exposing a filtered API or internal view so moderators can triage concerns without direct SQL access.

## Auditing & Follow-up

* Use `portal.audit_log` for any staff actions (approvals, declines, manual claims). The server actions already log successful claims.
* For partner/volunteer workflows, remember to record the decision in `metadata` so future operators understand why access was granted or deferred.
* When building the staff UI, expose the tracking code, created timestamp, and contact details, and provide quick links to the relevant profile when `profile_id` is present.

## Next Steps for UI/Automation

* **Staff Intake Dashboard:** list `client_intake` and `client_claim` rows requiring follow-up. Provide a button that triggers `portal.claim_registration_flow` when enough identifiers are present.
* **Partner & Volunteer Review:** build moderation queues that update `status`, adjust portal roles, and send templated notifications.
* **Concern Triage:** connect to notification tooling (`portal_queue_notification`) to acknowledge submissions and document resolution notes in `metadata`.

Keep these flows trauma-informed: always surface contact safety toggles, never expose sensitive metadata in public contexts, and respect the consent flags stored with each submission.
