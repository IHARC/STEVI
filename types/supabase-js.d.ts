/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@supabase/supabase-js' {
  export type SupabaseClient<Database = unknown> = {
    auth: Record<string, (...args: any[]) => Promise<any>>;
    functions: {
      invoke: (fn: string, options?: Record<string, unknown>) => Promise<any>;
    };
    rpc: (
      fn: string,
      args?: Record<string, unknown> | null,
      options?: Record<string, unknown>,
    ) => Promise<{ data: any; error: any }>;
    schema: (name: string) => SupabaseClient<Database>;
    from: (...args: any[]) => any;
  } & Record<string, any>;

  export type SupabaseClientOptions = Record<string, unknown>;

  export function createClient<Database = unknown>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions,
  ): SupabaseClient<Database>;
}
