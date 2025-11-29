import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { PersonRecord } from '@/lib/cases/types';
import { getGrantScopes } from '@/lib/enum-values';

const PEOPLE_TABLE = 'people';
const GRANTS_TABLE = 'person_access_grants';
const USER_PEOPLE_TABLE = 'user_people';

async function findPersonViaUserLink(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<PersonRecord | null> {
  const core = supabase.schema('core');

  const { data: linkRow, error: linkError } = await core
    .from(USER_PEOPLE_TABLE)
    .select('person_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (linkError) {
    throw new Error('Unable to resolve your client link right now.');
  }

  if (!linkRow?.person_id) {
    return null;
  }

  const { data: person, error: personError } = await core
    .from(PEOPLE_TABLE)
    .select('*')
    .eq('id', linkRow.person_id)
    .maybeSingle();

  if (personError) {
    throw new Error('Unable to load linked client record.');
  }

  return person ?? null;
}

async function findPersonViaGrant(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<PersonRecord | null> {
  const core = supabase.schema('core');

  const grantScopes = await getGrantScopes(supabase);
  if (grantScopes.length === 0) {
    return null;
  }

  const { data: grantRow, error: grantError } = await core
    .from(GRANTS_TABLE)
    .select('person_id')
    .eq('grantee_user_id', userId)
    .in('scope', grantScopes as string[])
    .order('granted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (grantError) {
    throw new Error('Unable to resolve access grants right now.');
  }

  if (!grantRow?.person_id) {
    return null;
  }

  const { data: person, error: personError } = await core
    .from(PEOPLE_TABLE)
    .select('*')
    .eq('id', grantRow.person_id)
    .maybeSingle();

  if (personError) {
    throw new Error('Unable to load linked client record.');
  }

  return person ?? null;
}

async function upsertUserPersonLink(
  supabase: SupabaseAnyServerClient,
  userId: string,
  personId: number,
) {
  const core = supabase.schema('core');
  await core.from(USER_PEOPLE_TABLE).upsert(
    {
      user_id: userId,
      person_id: personId,
    },
    { onConflict: 'user_id' },
  );
}

export async function findPersonForUser(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<PersonRecord | null> {
  const viaLink = await findPersonViaUserLink(supabase, userId);
  if (viaLink) return viaLink;

  const viaGrant = await findPersonViaGrant(supabase, userId);
  if (viaGrant) {
    await upsertUserPersonLink(supabase, userId, viaGrant.id);
    return viaGrant;
  }

  return null;
}

export async function requirePersonForUser(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<PersonRecord> {
  const person = await findPersonForUser(supabase, userId);
  if (!person) {
    throw new Error('Your profile has not been onboarded to case management yet.');
  }
  return person;
}
