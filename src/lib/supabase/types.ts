import type { createSupabaseServerClient } from './server';
import type { createSupabaseRSCClient } from './rsc';
import type { createSupabaseClient } from './client';

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
export type SupabaseRSCClient = Awaited<ReturnType<typeof createSupabaseRSCClient>>;
export type SupabaseAnyServerClient = SupabaseServerClient | SupabaseRSCClient;
export type SupabaseBrowserClient = ReturnType<typeof createSupabaseClient>;
