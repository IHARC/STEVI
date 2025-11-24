import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { PersonRecord } from '@/lib/cases/types';

const PEOPLE_TABLE = 'people';

export async function findPersonForUser(
  supabase: SupabaseAnyServerClient,
  userId: string,
): Promise<PersonRecord | null> {
  const core = supabase.schema('core');
  const { data, error } = await core
    .from(PEOPLE_TABLE)
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to resolve your person record right now.');
  }

  return data ?? null;
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
