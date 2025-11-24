import type { Json } from '@/types/supabase';
import { sanitizeForAudit } from '@/lib/safety';
import type { SupabaseServerClient } from '@/lib/supabase/types';

type AuditPayload = {
  actorProfileId?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  meta?: Record<string, unknown>;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!UUID_REGEX.test(value)) {
    throw new Error(`Audit entityId must be a UUID. Received "${value}".`);
  }
  return value;
}

export async function logAuditEvent(
  supabase: SupabaseServerClient,
  { actorProfileId = null, action, entityType, entityId, meta }: AuditPayload,
) {
  const sanitizedMeta = meta ? sanitizeForAudit(meta) : {};
  const metaJson = sanitizedMeta as Json;
  const { error } = await supabase.rpc('portal_log_audit_event', {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: normalizeUuid(entityId),
    p_meta: metaJson,
    p_actor_profile_id: normalizeUuid(actorProfileId),
  });

  if (error) {
    throw error;
  }
}
