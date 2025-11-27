import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { ensurePortalProfile } from '@/lib/profile';
import type { SupabaseServerClient } from '@/lib/supabase/types';
import type { IntakeSubmission } from '@/lib/cases/types';
import { createPersonGrant } from '@/lib/cases/grants';

const PEOPLE_TABLE = 'people';
const CASE_TABLE = 'case_management';
const REGISTRATION_TABLE = 'registration_flows';
const ACTIVITIES_TABLE = 'people_activities';

type ProcessResult = {
  personId: number;
  caseId: number;
};

export async function processClientIntake(
  supabase: SupabaseServerClient,
  intakeId: string,
  actorUserId: string,
): Promise<ProcessResult> {
  const portal = supabase.schema('portal');
  const core = supabase.schema('core');
  const caseMgmt = supabase.schema('case_mgmt');

  const { data: intakeRow, error: intakeError } = await portal
    .from(REGISTRATION_TABLE)
    .select('*')
    .eq('id', intakeId)
    .eq('flow_type', 'client_intake')
    .maybeSingle();

  if (intakeError) {
    throw new Error('Unable to load intake submission.');
  }
  if (!intakeRow) {
    throw new Error('That intake no longer exists.');
  }
  if (intakeRow.status !== 'submitted') {
    throw new Error('This intake has already been processed.');
  }

  const actorProfile = await ensurePortalProfile(supabase, actorUserId);

  // Create a fresh person record; do not attempt to link to any existing person automatically.
  const personInsert = {
    first_name: intakeRow.chosen_name ?? 'Client',
    last_name: null,
    email: intakeRow.contact_email,
    phone: intakeRow.contact_phone,
    data_sharing_consent: intakeRow.consent_data_sharing ?? null,
    preferred_contact_method: derivePreferredContact(intakeRow),
    created_by: intakeRow.supabase_user_id ?? actorUserId,
    person_category: null,
    person_type: null,
    status: 'active' as const,
  };

  const { data: person, error: personError } = await core
    .from(PEOPLE_TABLE)
    .insert(personInsert)
    .select('*')
    .single();

  if (personError) {
    throw new Error('Could not create a person record for this intake.');
  }

  // Link the authenticated user (if any) to the new person record for deterministic resolution.
  if (intakeRow.supabase_user_id) {
    await core
      .from('user_people')
      .upsert(
        {
          user_id: intakeRow.supabase_user_id,
          profile_id: intakeRow.profile_id ?? null,
          person_id: person.id,
        },
        { onConflict: 'user_id' },
      )
      .throwOnError();
  }

  const caseInsert = {
    person_id: person.id,
    case_manager_name: actorProfile.display_name,
    case_manager_contact: intakeRow.contact_email,
    case_number: null,
    case_type: 'intake',
    priority: 'standard',
    status: 'active',
    start_date: new Date().toISOString(),
    created_by: actorUserId,
  } as const;

  const { data: caseRow, error: caseError } = await caseMgmt.from(CASE_TABLE).insert(caseInsert).select('*').single();

  if (caseError) {
    throw new Error('Could not open a case for this intake.');
  }

  await maybeGrantDefaults({
    supabase,
    personId: person.id,
    clientUserId: intakeRow.supabase_user_id,
    actorProfileId: actorProfile.id,
    actorUserId,
    actorOrgId: actorProfile.organization_id,
  });

  // Optional activity log noting consent + intake capture.
  await core
    .from(ACTIVITIES_TABLE)
    .insert({
      person_id: person.id,
      activity_type: 'intake',
      activity_date: new Date().toISOString().slice(0, 10),
      activity_time: new Date().toISOString().slice(11, 19),
      title: 'Intake processed',
      description: 'Client intake converted to case. Consents captured.',
      staff_member: actorProfile.display_name,
      metadata: {
        intake_id: intakeRow.id,
        consent_contact: intakeRow.consent_contact,
        consent_data_sharing: intakeRow.consent_data_sharing,
        client_visible: false,
      },
      created_by: actorUserId,
      provider_profile_id: actorProfile.id,
      provider_org_id: actorProfile.organization_id,
    })
    .throwOnError();

  const { error: updateError } = await portal
    .from(REGISTRATION_TABLE)
    .update({ status: 'processed', updated_by_user_id: actorUserId, profile_id: intakeRow.profile_id })
    .eq('id', intakeRow.id);

  if (updateError) {
    throw new Error('Case created, but failed to mark intake as processed.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'intake_processed',
    entityType: 'registration_flow',
    entityRef: buildEntityRef({ schema: 'portal', table: REGISTRATION_TABLE, id: intakeRow.id }),
    meta: { pk_uuid: intakeRow.id, person_id: person.id, case_id: caseRow.id },
  });

  return { personId: person.id, caseId: caseRow.id };
}

function derivePreferredContact(intake: IntakeSubmission): string | null {
  const choiceRaw = intake.metadata?.contact_choice;
  const choice = typeof choiceRaw === 'string' ? choiceRaw : null;
  if (!choice) return null;
  if (choice === 'email' || choice === 'phone' || choice === 'both' || choice === 'none') {
    return choice;
  }
  return null;
}

async function maybeGrantDefaults({
  supabase,
  personId,
  clientUserId,
  actorProfileId,
  actorUserId,
  actorOrgId,
}: {
  supabase: SupabaseServerClient;
  personId: number;
  clientUserId: string | null;
  actorProfileId: string;
  actorUserId: string;
  actorOrgId: number | null;
}) {
  if (clientUserId) {
    await createPersonGrant(supabase, {
      personId,
      scope: 'timeline_client',
      granteeUserId: clientUserId,
      granteeOrgId: null,
      actorProfileId,
      actorUserId,
    });
    await createPersonGrant(supabase, {
      personId,
      scope: 'view',
      granteeUserId: clientUserId,
      granteeOrgId: null,
      actorProfileId,
      actorUserId,
    });
  }

  if (actorOrgId !== null) {
    await createPersonGrant(supabase, {
      personId,
      scope: 'timeline_full',
      granteeUserId: null,
      granteeOrgId: actorOrgId,
      actorProfileId,
      actorUserId,
    });
    await createPersonGrant(supabase, {
      personId,
      scope: 'write_notes',
      granteeUserId: null,
      granteeOrgId: actorOrgId,
      actorProfileId,
      actorUserId,
    });
  }
}
