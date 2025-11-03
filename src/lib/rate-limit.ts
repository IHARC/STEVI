import type { Database } from '@/types/supabase';
import type { SupabaseAnyServerClient } from '@/lib/supabase/types';

type RateLimitRow = Database['public']['Functions']['portal_check_rate_limit']['Returns'][number];

type RateLimitParams = {
  supabase: SupabaseAnyServerClient;
  type: 'idea' | 'comment' | 'flag' | 'idea_update';
  limit: number;
  cooldownMs?: number;
};

export type RateLimitResult =
  | { allowed: true; retryInMs: 0 }
  | { allowed: false; retryInMs: number };

export async function checkRateLimit({ supabase, type, limit, cooldownMs }: RateLimitParams): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc('portal_check_rate_limit', {
    p_event: type,
    p_limit: limit,
    p_cooldown_ms: cooldownMs ?? null,
  });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as RateLimitRow[];
  const [result] = rows;

  if (!result || result.allowed) {
    return { allowed: true, retryInMs: 0 };
  }

  const retryMs = Math.max(result.retry_in_ms ?? 0, 0);
  return { allowed: false, retryInMs: retryMs || 1000 };
}
