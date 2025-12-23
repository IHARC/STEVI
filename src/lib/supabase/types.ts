import type { createSupabaseServerClient } from './server';
import type { createSupabaseRSCClient } from './rsc';
import type { createSupabaseAuthServerClient } from './auth-server';
import type { createSupabaseAuthRSCClient } from './auth-rsc';

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
export type SupabaseRSCClient = Awaited<ReturnType<typeof createSupabaseRSCClient>>;
export type SupabaseAnyServerClient = SupabaseServerClient | SupabaseRSCClient;
export type SupabaseAuthServerClient = Awaited<ReturnType<typeof createSupabaseAuthServerClient>>;
export type SupabaseAuthRSCClient = Awaited<ReturnType<typeof createSupabaseAuthRSCClient>>;
