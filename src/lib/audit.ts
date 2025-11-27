import type { Json } from '@/types/supabase';
import { sanitizeForAudit } from '@/lib/safety';
import type { SupabaseServerClient } from '@/lib/supabase/types';

export type EntityId = string | number | null | undefined;

export type EntityRefInput = {
  schema: string;
  table: string;
  id: EntityId;
};

type AuditPayload = {
  actorProfileId?: EntityId;
  action: string;
  entityType: string;
  entityRef?: EntityRefInput | string | null;
  entityId?: EntityId; // legacy/fallback
  meta?: Record<string, unknown>;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTEGER_REGEX = /^[0-9]+$/;
const NAME_REGEX = /^[a-z0-9_]+$/i;
const ID_REGEX = /^[a-zA-Z0-9._:-]+$/;

function normalizeLooseId(value: EntityId): string | null {
  if (value === null || value === undefined) return null;

  const asString = typeof value === 'number' ? String(value) : value.trim?.() ?? value;

  if (typeof asString !== 'string' || asString.length === 0) {
    return null;
  }

  if (UUID_REGEX.test(asString) || INTEGER_REGEX.test(asString)) {
    return asString;
  }

  return asString.slice(0, 128);
}

function normalizeUuid(value: EntityId): string | null {
  const loose = normalizeLooseId(value);
  if (loose && UUID_REGEX.test(loose)) {
    return loose;
  }
  return null;
}

export function buildEntityRef(input: EntityRefInput | null | undefined): string | null {
  if (!input) return null;
  const { schema, table, id } = input;
  if (!NAME_REGEX.test(schema) || !NAME_REGEX.test(table)) {
    return null;
  }
  const idValue = normalizeLooseId(id);
  if (!idValue || !ID_REGEX.test(idValue)) {
    return null;
  }
  return `${schema.toLowerCase()}.${table.toLowerCase()}:${idValue}`;
}

export async function logAuditEvent(
  supabase: SupabaseServerClient,
  { actorProfileId = null, action, entityType, entityRef, entityId, meta }: AuditPayload,
) {
  const sanitizedMeta = meta ? sanitizeForAudit(meta) : {};
  const entityRefString = typeof entityRef === 'string' ? entityRef : buildEntityRef(entityRef);

  let normalizedEntityId = normalizeUuid(entityId);
  if (!normalizedEntityId && entityRefString) {
    const maybeId = entityRefString.split(':').pop();
    normalizedEntityId = normalizeUuid(maybeId ?? null);
  }

  const metaWithRef =
    entityRefString && !('entity_ref' in sanitizedMeta)
      ? { ...sanitizedMeta, entity_ref: entityRefString }
      : sanitizedMeta;

  const metaJson = metaWithRef as Json;
  const normalizedActorId = normalizeUuid(actorProfileId);

  const { error } = await supabase.rpc('portal_log_audit_event', {
    p_action: action,
    p_entity_type: entityType,
    p_entity_id: normalizedEntityId,
    p_meta: metaJson,
    p_actor_profile_id: normalizedActorId,
  });

  if (error) {
    throw error;
  }
}
