'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { queuePortalNotification } from '@/lib/notifications';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';

type ActionResult = { success: boolean; message?: string; error?: string };

function readValue(formData: FormData, key: string, maxLength = 300): string {
  const raw = formData.get(key);
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, maxLength);
}

async function baseAction(formData: FormData, action: 'request_link' | 'extend_access'): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    return { success: false, error: 'You need to sign in to request document updates.' };
  }

  const path = readValue(formData, 'path');
  const reason = readValue(formData, 'reason', 500) || 'Client requested assistance with document access.';

  if (!path) {
    return { success: false, error: 'Document path missing.' };
  }

  try {
    await queuePortalNotification(supabase, {
      profileId: access.profile.id,
      subject: action === 'extend_access' ? 'Extend document access' : 'Request new document link',
      bodyText: `${access.profile.display_name} requested help with ${path}. Reason: ${reason}`,
      type: 'document_access_request',
      payload: { path, action, reason },
    });

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: action === 'extend_access' ? 'document_extend_requested' : 'document_link_requested',
      entityType: 'portal_attachment',
      entityRef: buildEntityRef({ schema: 'storage', table: 'objects', id: path }),
      meta: { reason },
    });

    revalidatePath('/documents');

    return { success: true, message: 'We received your request. The team will follow up shortly.' };
  } catch (error) {
    console.error('Document request failed', error);
    return { success: false, error: 'Unable to send your request. Please try again or contact support.' };
  }
}

export async function requestDocumentLinkAction(_prev: ActionResult, formData: FormData) {
  return baseAction(formData, 'request_link');
}

export async function extendDocumentAccessAction(_prev: ActionResult, formData: FormData) {
  return baseAction(formData, 'extend_access');
}
