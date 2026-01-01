'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { queuePortalNotification } from '@/lib/notifications';
import { logAuditEvent, buildEntityRef } from '@/lib/audit';
import { assertOnboardingComplete } from '@/lib/onboarding/guard';
import { actionError, actionOk, parseFormData } from '@/lib/server-actions/validate';
import type { ActionState } from '@/lib/server-actions/validate';

const DEFAULT_REASON = 'Client requested assistance with document access.';

type DocumentActionData = { message: string };

type DocumentActionState = ActionState<DocumentActionData>;

const requestSchema = z.object({
  path: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : ''),
    z
      .string()
      .min(1, 'Document path missing.')
      .max(300, 'Document path must be 300 characters or fewer.'),
  ),
  reason: z.preprocess(
    (value) => (typeof value === 'string' ? value.trim() : undefined),
    z.string().max(500, 'Reason must be 500 characters or fewer.').optional(),
  ),
});

async function baseAction(
  formData: FormData,
  action: 'request_link' | 'extend_access',
): Promise<DocumentActionState> {
  const parsed = parseFormData(formData, requestSchema);
  if (!parsed.ok) {
    return parsed;
  }

  const { path, reason: reasonRaw } = parsed.data;
  const reason = reasonRaw || DEFAULT_REASON;

  const supabase = await createSupabaseServerClient();
  const access = await loadPortalAccess(supabase);

  if (!access) {
    return actionError('You need to sign in to request document updates.');
  }

  try {
    await assertOnboardingComplete(supabase, access.userId);
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : 'Finish onboarding before requesting documents.',
    );
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

    return actionOk({ message: 'We received your request. The team will follow up shortly.' });
  } catch (error) {
    console.error('Document request failed', error);
    return actionError('Unable to send your request. Please try again or contact support.');
  }
}

export async function requestDocumentLinkAction(_prev: DocumentActionState, formData: FormData) {
  return baseAction(formData, 'request_link');
}

export async function extendDocumentAccessAction(_prev: DocumentActionState, formData: FormData) {
  return baseAction(formData, 'extend_access');
}
