'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';

type AdminContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  actorProfileId: string;
  actorUserId: string;
};

async function requirePortalAdmin(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to continue.');
  }

  if (!access.isGlobalAdmin) {
    throw new Error('IHARC admin access is required.');
  }

  return { supabase, actorProfileId: access.profile.id, actorUserId: access.userId };
}

async function upsertSystemSetting(args: {
  settingKey: string;
  settingValue: string | null;
  settingType: string;
  description?: string;
  actorUserId: string;
  actorProfileId: string;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
}) {
  const { supabase, actorProfileId, actorUserId, settingKey, settingValue, settingType, description } = args;

  const payload = {
    setting_key: settingKey,
    setting_value: settingValue,
    setting_type: settingType,
    description: description ?? null,
    updated_by: actorUserId,
  };

  const { error } = await supabase.schema('core').from('system_settings').upsert(payload, { onConflict: 'setting_key' });
  if (error) throw error;

  await logAuditEvent(supabase, {
    actorProfileId,
    action: 'system_setting_updated',
    entityType: 'system_setting',
    entityRef: buildEntityRef({ schema: 'core', table: 'system_settings', id: settingKey }),
    meta: { setting_key: settingKey },
  });
}

export async function upsertOpenAiApiKeyAction(formData: FormData) {
  const { supabase, actorProfileId, actorUserId } = await requirePortalAdmin();

  const apiKey = (formData.get('openai_api_key') as string | null)?.trim() ?? '';
  if (!apiKey) {
    throw new Error('OpenAI API key is required.');
  }

  await upsertSystemSetting({
    supabase,
    actorProfileId,
    actorUserId,
    settingKey: 'openai_api_key',
    settingValue: apiKey,
    settingType: 'string',
    description: 'OpenAI API key used by Edge Functions',
  });

  revalidatePath('/app-admin/integrations');
}

export async function upsertAiModelAction(formData: FormData) {
  const { supabase, actorProfileId, actorUserId } = await requirePortalAdmin();

  const model = (formData.get('ai_model') as string | null)?.trim() ?? '';
  if (!model) {
    throw new Error('AI model is required.');
  }

  await upsertSystemSetting({
    supabase,
    actorProfileId,
    actorUserId,
    settingKey: 'ai_model',
    settingValue: model,
    settingType: 'string',
    description: 'OpenAI GPT model for AI text enhancement',
  });

  revalidatePath('/app-admin/integrations');
}

export async function upsertAiSystemPromptAction(formData: FormData) {
  const { supabase, actorProfileId, actorUserId } = await requirePortalAdmin();

  const prompt = (formData.get('ai_system_prompt') as string | null)?.trim() ?? '';
  if (!prompt) {
    throw new Error('AI system prompt cannot be empty.');
  }

  await upsertSystemSetting({
    supabase,
    actorProfileId,
    actorUserId,
    settingKey: 'ai_system_prompt',
    settingValue: prompt,
    settingType: 'text',
    description: 'System prompt for AI text enhancement',
  });

  revalidatePath('/app-admin/integrations');
}

export async function upsertAiInsightsTtlMinutesAction(formData: FormData) {
  const { supabase, actorProfileId, actorUserId } = await requirePortalAdmin();

  const ttlRaw = (formData.get('ai_insights_ttl_minutes') as string | null)?.trim() ?? '';
  if (!ttlRaw) {
    throw new Error('AI insights TTL is required.');
  }

  const ttlMinutes = Number.parseInt(ttlRaw, 10);
  if (!Number.isFinite(ttlMinutes) || ttlMinutes < 1 || ttlMinutes > 10_080) {
    throw new Error('AI insights TTL must be between 1 and 10080 minutes.');
  }

  await upsertSystemSetting({
    supabase,
    actorProfileId,
    actorUserId,
    settingKey: 'ai_insights_ttl_minutes',
    settingValue: String(ttlMinutes),
    settingType: 'number',
    description: 'TTL in minutes for cached AI insights (person analyzer)',
  });

  revalidatePath('/app-admin/integrations');
}
