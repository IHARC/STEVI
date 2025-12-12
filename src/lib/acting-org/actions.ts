'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { ensurePortalProfile } from '@/lib/profile';

export async function setActingOrganization(organizationId: number | null, returnTo?: string) {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  const allowedIds = access.actingOrgChoices.map((choice) => choice.id);
  if (organizationId !== null && !allowedIds.includes(organizationId)) {
    throw new Error('You do not have access to that organization.');
  }

  const profile = await ensurePortalProfile(supabase, access.userId);

  const { error } = await supabase
    .schema('portal')
    .from('profiles')
    .update({ organization_id: organizationId, requested_organization_name: null })
    .eq('id', profile.id);

  if (error) {
    throw new Error('Unable to switch organizations right now.');
  }

  await supabase.rpc('refresh_user_permissions', { user_uuid: access.userId });

  redirect(returnTo || '/ops/today');
}

