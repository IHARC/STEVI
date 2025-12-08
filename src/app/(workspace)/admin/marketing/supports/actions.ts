'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import {
  MARKETING_SETTINGS_KEYS,
  SupportEntry,
  SupportContact,
  assertNonEmpty,
} from '@/lib/marketing/settings';

const ADMIN_PATHS = ['/admin', '/admin/website'] as const;

function parseSupports(raw: string | null): SupportEntry[] {
  if (!raw) {
    throw new Error('Support entries are required.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Support entries must be valid JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Support entries must be an array.');
  }
  const entries = parsed.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Support entry ${index + 1} is invalid.`);
    }
    const contacts = Array.isArray((entry as SupportEntry).contacts)
      ? ((entry as SupportEntry).contacts as SupportContact[])
      : [];

    return {
      title: assertNonEmpty((entry as SupportEntry).title, `Support entry ${index + 1} title`),
      summary: assertNonEmpty((entry as SupportEntry).summary, `Support entry ${index + 1} summary`),
      body: assertNonEmpty((entry as SupportEntry).body, `Support entry ${index + 1} body`),
      contacts: contacts.map((contact, contactIndex) => ({
        label: assertNonEmpty(
          contact?.label ?? '',
          `Support entry ${index + 1} contact ${contactIndex + 1} label`,
        ),
        href: contact?.href?.trim?.() ?? null,
      })),
    };
  });
  if (entries.length === 0) {
    throw new Error('Add at least one support entry.');
  }
  return entries;
}

function parseMutualAid(raw: string | null): string[] {
  if (!raw) {
    throw new Error('Mutual aid notes are required.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Mutual aid notes must be valid JSON.');
  }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error('Mutual aid notes must be an array of strings.');
  }
  return parsed.map((item) => assertNonEmpty(item, 'Mutual aid entry'));
}

async function requireAdminContext() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to manage supports.');
  }

  if (!access.canManageWebsiteContent) {
    throw new Error('Portal admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, portal: supabase.schema('portal'), actorProfile };
}

export async function saveSupports(formData: FormData) {
  const urgent = parseSupports(
    typeof formData.get('urgent_supports_json') === 'string'
      ? (formData.get('urgent_supports_json') as string)
      : null,
  );
  const mutualAid = parseMutualAid(
    typeof formData.get('mutual_aid_json') === 'string'
      ? (formData.get('mutual_aid_json') as string)
      : null,
  );

  const { supabase, portal, actorProfile } = await requireAdminContext();
  const now = new Date().toISOString();

  const { error: urgentError } = await portal.from('public_settings').upsert(
    {
      setting_key: MARKETING_SETTINGS_KEYS.supportsUrgent,
      setting_type: 'json',
      setting_value: JSON.stringify(urgent),
      is_public: true,
      updated_by_profile_id: actorProfile.id,
      updated_at: now,
    },
    { onConflict: 'setting_key' },
  );
  if (urgentError) throw urgentError;

  const { error: mutualAidError } = await portal.from('public_settings').upsert(
    {
      setting_key: MARKETING_SETTINGS_KEYS.supportsMutualAid,
      setting_type: 'json',
      setting_value: JSON.stringify(mutualAid),
      is_public: true,
      updated_by_profile_id: actorProfile.id,
      updated_at: now,
    },
    { onConflict: 'setting_key' },
  );
  if (mutualAidError) throw mutualAidError;

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'marketing_supports_updated',
    entityType: 'marketing_supports',
    entityRef: buildEntityRef({ schema: 'portal', table: 'public_settings', id: MARKETING_SETTINGS_KEYS.supportsUrgent }),
    meta: { urgent: urgent.length, mutual_aid: mutualAid.length },
  });

  ADMIN_PATHS.forEach((path) => revalidatePath(path));
}
