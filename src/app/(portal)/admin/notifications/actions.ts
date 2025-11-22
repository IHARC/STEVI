'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logAuditEvent } from '@/lib/audit';
import { queuePortalNotification } from '@/lib/notifications';
import { getUserEmailForProfile } from '@/lib/profile';
import { ensurePortalProfile } from '@/lib/profile';
import { getPortalRoles } from '@/lib/ihar-auth';

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
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw userError ?? new Error('Sign in to send notifications.');
  }

  const actorProfile = await ensurePortalProfile(supabase, user.id);
  const portalRoles = getPortalRoles(user);
  if (!portalRoles.includes('portal_admin')) {
    throw new Error('Only admins can send notifications.');
  }

  return { supabase, actorProfile };
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

    if (!recipientProfileId && !providedEmail) {
      throw new Error('Select a recipient or provide an email address.');
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

    await queuePortalNotification(supabase, {
      profileId: recipientProfileId,
      email: recipientEmail,
      subject,
      bodyText,
      bodyHtml: bodyHtml ?? undefined,
      type: notificationType,
      payload: payload ?? undefined,
    });

    await logAuditEvent(supabase, {
      actorProfileId: actorProfile.id,
      action: 'notification_queued',
      entityType: 'notification',
      entityId: null,
      meta: {
        recipient_profile_id: recipientProfileId,
        recipient_email: recipientEmail,
        notification_type: notificationType,
      },
    });

    await Promise.all(ADMIN_PATHS.map((path) => revalidatePath(path)));

    return { success: true };
  } catch (error) {
    console.error('sendNotificationAction error', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
