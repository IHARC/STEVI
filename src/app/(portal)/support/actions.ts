'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { queuePortalNotification } from '@/lib/notifications';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';

type SupportComposerState = { success: boolean; message?: string; error?: string };

function readField(formData: FormData, key: string, maxLength = 2000): string {
  const value = formData.get(key);
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.slice(0, maxLength);
}

export async function submitSupportMessage(
  _prevState: SupportComposerState,
  formData: FormData,
): Promise<SupportComposerState> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    return { success: false, error: 'You need to be signed in to message the team.' };
  }

  const message = readField(formData, 'message');
  const preferredContact = readField(formData, 'preferredContact', 120) || 'not provided';

  if (message.length < 10) {
    return { success: false, error: 'Please share a few details so the team can help.' };
  }

  try {
    await queuePortalNotification(supabase, {
      profileId: access.profile.id,
      subject: `Support request from ${access.profile.display_name}`,
      bodyText: `${message}\n\nPreferred contact: ${preferredContact}`,
      type: 'support_request',
      payload: {
        preferredContact,
        source: 'client_portal',
      },
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'support_request_submitted',
      entityType: 'support_request',
      entityRef: buildEntityRef({ schema: 'portal', table: 'profiles', id: access.profile.id }),
      meta: { preferredContact },
    });

    revalidatePath('/support');

    return { success: true, message: 'Thanks for reaching out. The outreach team will respond within one business day.' };
  } catch (error) {
    console.error('Failed to submit support request', error);
    return { success: false, error: 'We could not send your message right now. Please try again or call the coordination desk.' };
  }
}
