'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected, loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';

function parsePersonId(formData: FormData): number {
  const raw = String(formData.get('person_id') ?? '').trim();
  const parsed = Number.parseInt(raw, 10);
  if (!parsed || Number.isNaN(parsed)) {
    throw new Error('Invalid person id.');
  }
  return parsed;
}

function parseShortText(formData: FormData, key: string, label: string, max = 240): string {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) {
    throw new Error(`${label} is required.`);
  }
  if (raw.length > max) {
    throw new Error(`${label} must be ${max} characters or fewer.`);
  }
  return raw;
}

function parseOptionalText(formData: FormData, key: string, max = 240): string | null {
  const raw = String(formData.get(key) ?? '').trim();
  if (!raw) return null;
  return raw.length > max ? raw.slice(0, max) : raw;
}

function hasConsentRequestAccess(access: Awaited<ReturnType<typeof loadPortalAccess>> | null) {
  return Boolean(access && (access.canAccessOpsFrontline || access.canAccessOpsOrg || access.canAccessOpsAdmin || access.canManageConsents));
}

export async function requestConsentAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!hasConsentRequestAccess(access)) {
    throw new Error('You do not have permission to request consent.');
  }

  assertOrganizationSelected(access, 'Select your acting organization before requesting consent.');

  const personId = parsePersonId(formData);
  const purpose = parseShortText(formData, 'purpose', 'Purpose');
  const note = parseOptionalText(formData, 'request_note');

  const { data: requestId, error } = await supabase.schema('core').rpc('request_person_consent', {
    p_person_id: personId,
    p_org_id: access.organizationId,
    p_purpose: purpose,
    p_requested_scopes: ['view', 'update_contact'],
    p_note: note,
  });

  if (error) {
    throw new Error(error.message ?? 'Unable to request consent right now.');
  }

  if (requestId) {
    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'consent_request_submitted',
      entityType: 'core.person_consent_requests',
      entityRef: buildEntityRef({ schema: 'core', table: 'person_consent_requests', id: String(requestId) }),
      meta: {
        person_id: personId,
        requesting_org_id: access.organizationId,
        purpose,
      },
    });
  }

  revalidatePath('/ops/consents');
}

export async function logConsentContactAction(formData: FormData): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!hasConsentRequestAccess(access)) {
    throw new Error('You do not have permission to log consent contact.');
  }

  assertOrganizationSelected(access, 'Select your acting organization before logging consent contact.');

  const personId = parsePersonId(formData);
  const summary = parseShortText(formData, 'contact_summary', 'Summary');

  const { error } = await supabase.schema('core').rpc('log_consent_contact', {
    p_person_id: personId,
    p_org_id: access.organizationId,
    p_summary: summary,
  });

  if (error) {
    throw new Error(error.message ?? 'Unable to log consent contact right now.');
  }

  await logAuditEvent(supabase, {
    actorProfileId: access.profile.id,
    action: 'consent_contact_logged',
    entityType: 'core.people_activities',
    entityRef: null,
    meta: {
      person_id: personId,
      requesting_org_id: access.organizationId,
      summary,
    },
  });

  revalidatePath('/ops/consents');
}
