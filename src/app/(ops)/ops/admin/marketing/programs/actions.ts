'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { MARKETING_SETTINGS_KEYS, ProgramEntry, assertNonEmpty } from '@/lib/marketing/settings';

const ADMIN_PATHS = ['/ops/admin/website/programs'] as const;

function parsePrograms(raw: string | null): ProgramEntry[] {
  if (!raw) {
    throw new Error('Programs are required.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Programs must be valid JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Programs must be an array.');
  }

  const entries = parsed.map((program, index) => {
    if (!program || typeof program !== 'object') {
      throw new Error(`Program ${index + 1} is invalid.`);
    }
    return {
      title: assertNonEmpty((program as ProgramEntry).title, `Program ${index + 1} title`),
      description: assertNonEmpty(
        (program as ProgramEntry).description,
        `Program ${index + 1} description`,
      ),
    };
  });

  if (entries.length === 0) {
    throw new Error('Add at least one program.');
  }

  return entries;
}

async function requireAdminContext() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to manage programs.');
  }

  if (!access.canManageWebsiteContent) {
    throw new Error('Portal admin access is required.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, portal: supabase.schema('portal'), actorProfile };
}

export async function savePrograms(formData: FormData) {
  const programs = parsePrograms(
    typeof formData.get('programs_json') === 'string' ? (formData.get('programs_json') as string) : null,
  );

  const { supabase, portal, actorProfile } = await requireAdminContext();
  const now = new Date().toISOString();

  const { error } = await portal.from('public_settings').upsert(
    {
      setting_key: MARKETING_SETTINGS_KEYS.programs,
      setting_type: 'json',
      setting_value: JSON.stringify(programs),
      is_public: true,
      updated_by_profile_id: actorProfile.id,
      updated_at: now,
    },
    { onConflict: 'setting_key' },
  );
  if (error) throw error;

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'marketing_programs_updated',
    entityType: 'marketing_programs',
    entityRef: buildEntityRef({ schema: 'portal', table: 'public_settings', id: MARKETING_SETTINGS_KEYS.programs }),
    meta: { programs: programs.length },
  });

  ADMIN_PATHS.forEach((path) => revalidatePath(path));
}
