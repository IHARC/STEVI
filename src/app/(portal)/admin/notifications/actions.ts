'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { queuePortalNotification } from '@/lib/notifications';
import { getUserEmailForProfile } from '@/lib/profile';
import { ensurePortalProfile } from '@/lib/profile';
import { loadPortalAccess } from '@/lib/portal-access';
import type { SupabaseServerClient } from '@/lib/supabase/types';

const ADMIN_PATHS = ['/admin', '/admin/notifications'] as const;

type ActionResult = { success: true } | { success: false; error: string };

function readString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function requireString(formData: FormData, key: string, message: string): string {
  const value = readString(formData, key);
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function parsePayload(input: string | null): Record<string, unknown> | null {
  if (!input) {
    return null;
  }
  try {
    const parsed = JSON.parse(input);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    throw new Error('Payload must be valid JSON.');
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unable to send notification. Try again shortly.';
}

async function requireAdminContext() {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    throw new Error('Sign in to send notifications.');
  }

  if (!access.canManageNotifications) {
    throw new Error('Only admins can send notifications.');
  }

  const actorProfile = await ensurePortalProfile(supabase, access.userId);

  return { supabase, actorProfile };
}

type RelayPayload = {
  channel: 'email' | 'sms';
  provider: string;
  apiUrl?: string | null;
  apiKey?: string | null;
  fromEmail?: string | null;
  fromPhone?: string | null;
  isActive?: boolean;
};

function sanitizeRelayPayload(formData: FormData): RelayPayload {
  const channel = (readString(formData, 'channel') as RelayPayload['channel']) ?? 'email';
  const provider = readString(formData, 'provider');
  if (!provider) {
    throw new Error('Provider name is required.');
  }

  return {
    channel,
    provider,
    apiUrl: readString(formData, 'api_url'),
    apiKey: readString(formData, 'api_key'),
    fromEmail: readString(formData, 'from_email'),
    fromPhone: readString(formData, 'from_phone'),
    isActive: readString(formData, 'is_active') === 'true',
  };
}

async function upsertRelay(supabase: SupabaseServerClient, payload: RelayPayload) {
  const { error } = await supabase
    .schema('portal')
    .from('notification_relays')
    .upsert(
      {
        channel: payload.channel,
        provider: payload.provider,
        api_url: payload.apiUrl,
        api_key: payload.apiKey,
        from_email: payload.fromEmail,
        from_phone: payload.fromPhone,
        is_active: payload.isActive ?? true,
      },
      { onConflict: 'channel' },
    );

  if (error) {
    throw error;
  }
}

export async function upsertRelayAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, actorProfile } = await requireAdminContext();
    const payload = sanitizeRelayPayload(formData);

    await upsertRelay(supabase, payload);

  await logAuditEvent(supabase, {
    actorProfileId: actorProfile.id,
    action: 'notification_relay_saved',
    entityType: 'notification_relay',
    entityRef: buildEntityRef({ schema: 'portal', table: 'notifications', id: payload.channel }),
    meta: { channel: payload.channel, provider: payload.provider },
  });

    await Promise.all(ADMIN_PATHS.map((path) => revalidatePath(path)));

    return { success: true };
  } catch (error) {
    console.error('upsertRelayAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function sendNotificationAction(formData: FormData): Promise<ActionResult> {
  try {
    const subject = requireString(formData, 'subject', 'Add a subject line.');
    const bodyText = requireString(formData, 'body_text', 'Add the plain text body.');
    const bodyHtml = readString(formData, 'body_html');
    const notificationType = readString(formData, 'notification_type') ?? 'general';
    const payloadInput = readString(formData, 'payload_json');
    const recipientProfileId = readString(formData, 'recipient_profile_id');
    const providedEmail = readString(formData, 'recipient_email');
    const isTest = readString(formData, 'is_test') === 'true';

    if (!recipientProfileId && !providedEmail) {
      throw new Error('Select a recipient or provide an email address.');
    }

    if (isTest && !process.env.PORTAL_ALERTS_SECRET) {
      throw new Error('Configure PORTAL_ALERTS_SECRET before sending test notifications.');
    }

    const { supabase, actorProfile } = await requireAdminContext();

    let recipientEmail = providedEmail?.toLowerCase() ?? null;

    if (!recipientEmail && recipientProfileId) {
      recipientEmail = await getUserEmailForProfile(supabase, recipientProfileId);
    }

    if (!recipientEmail) {
      throw new Error('Recipient email is required. Update their profile before sending.');
    }

    const payload = parsePayload(payloadInput);

    const finalSubject = isTest ? `[TEST] ${subject}` : subject;
    const finalType = isTest ? 'test' : notificationType;

    await queuePortalNotification(supabase, {
      profileId: recipientProfileId,
      email: recipientEmail,
      subject: finalSubject,
      bodyText,
      bodyHtml: bodyHtml ?? undefined,
      type: finalType,
      payload: payload ?? undefined,
    });

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'notification_queued',
      entityType: 'notification',
      entityRef: null,
      meta: {
        recipient_profile_id: recipientProfileId,
        recipient_email: recipientEmail,
        notification_type: finalType,
        is_test: isTest,
      },
    });

    await Promise.all(ADMIN_PATHS.map((path) => revalidatePath(path)));

    return { success: true };
  } catch (error) {
    console.error('sendNotificationAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
