type SupabaseEnv = {
  url: string;
  anonKey: string;
};

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase public credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return { url, anonKey };
}

export function getSupabaseEnvOrNull(): SupabaseEnv | null {
  try {
    return getSupabaseEnv();
  } catch {
    return null;
  }
}
