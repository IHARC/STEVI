'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertOrganizationSelected } from '@/lib/portal-access';
import { buildEntityRef, logAuditEvent } from '@/lib/audit';
import { CFS_ATTACHMENTS_BUCKET } from '@/lib/cfs/constants';
import { sanitizeFileName } from '@/lib/utils';
import { actionError, actionOk, parseFormData, zodOptionalString, zodRequiredString } from '@/lib/server-actions/validate';
import {
  CfsAttachmentActionState,
  MAX_CFS_ATTACHMENT_BYTES,
  cfsDetailPath,
  loadActionAccess,
  requiredId,
} from './shared';

export async function uploadCfsAttachmentAction(
  _prevState: CfsAttachmentActionState,
  formData: FormData,
): Promise<CfsAttachmentActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        attachment_notes: zodOptionalString(),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, attachment_notes: notes } = parsed.data;
    const file = formData.get('attachment');

    if (!(file instanceof File)) {
      return actionError('Select a file to upload.', { attachment: 'Select a file to upload.' });
    }

    if (file.size > MAX_CFS_ATTACHMENT_BYTES) {
      return actionError('Attachment must be under 15 MB.', { attachment: 'Attachment must be under 15 MB.' });
    }

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canUpdateCfs) {
      return actionError('You do not have permission to upload attachments.');
    }

    assertOrganizationSelected(access, 'Select an acting organization to upload attachments.');

    const sanitizedName = sanitizeFileName(file.name || 'attachment');
    const objectPath = `cfs/${cfsId}/${randomUUID()}-${sanitizedName}`;

    const { error: uploadError } = await supabase.storage.from(CFS_ATTACHMENTS_BUCKET).upload(objectPath, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });

    if (uploadError) {
      throw uploadError;
    }

    const metadata: Record<string, unknown> = {};
    if (file.name) metadata.original_name = file.name;
    if (notes) metadata.notes = notes;

    const { data: attachmentRow, error: insertError } = await supabase
      .schema('case_mgmt')
      .from('cfs_attachments')
      .insert({
        cfs_id: cfsId,
        organization_id: access.organizationId,
        uploaded_by: access.userId,
        file_name: file.name || sanitizedName,
        file_type: file.type || null,
        file_size: file.size,
        storage_bucket: CFS_ATTACHMENTS_BUCKET,
        storage_path: objectPath,
        metadata: Object.keys(metadata).length ? metadata : null,
      })
      .select('id')
      .single();

    if (insertError || !attachmentRow) {
      await supabase.storage.from(CFS_ATTACHMENTS_BUCKET).remove([objectPath]);
      throw insertError ?? new Error('Unable to save attachment.');
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_attachment_uploaded',
      entityType: 'case_mgmt.cfs_attachments',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'cfs_attachments', id: attachmentRow.id }),
      meta: { cfs_id: cfsId, file_name: file.name || sanitizedName, file_size: file.size },
    });

    revalidatePath(cfsDetailPath(cfsId));
    return actionOk({ attachmentId: attachmentRow.id, message: 'Attachment uploaded.' });
  } catch (error) {
    console.error('uploadCfsAttachmentAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to upload attachment.');
  }
}

export async function deleteCfsAttachmentAction(formData: FormData): Promise<CfsAttachmentActionState> {
  try {
    const parsed = parseFormData(
      formData,
      z.object({
        cfs_id: requiredId('cfs_id is required.'),
        attachment_id: zodRequiredString('Attachment is required.'),
      }),
    );

    if (!parsed.ok) {
      return parsed;
    }

    const { cfs_id: cfsId, attachment_id: attachmentId } = parsed.data;

    const supabase = await createSupabaseServerClient();
    const access = await loadActionAccess(supabase);

    if (!access || !access.canDeleteCfs) {
      return actionError('You do not have permission to delete attachments.');
    }

    const { data: attachment, error } = await supabase
      .schema('case_mgmt')
      .from('cfs_attachments')
      .select('id, storage_bucket, storage_path, file_name')
      .eq('id', attachmentId)
      .eq('cfs_id', cfsId)
      .maybeSingle();

    if (error || !attachment) {
      return actionError('Attachment not found.');
    }

    const { error: storageError } = await supabase.storage.from(attachment.storage_bucket).remove([attachment.storage_path]);

    if (storageError) {
      throw storageError;
    }

    const { error: deleteError } = await supabase
      .schema('case_mgmt')
      .from('cfs_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      throw deleteError;
    }

    await logAuditEvent(supabase, {
      actorProfileId: access.profile.id,
      action: 'cfs_attachment_deleted',
      entityType: 'case_mgmt.cfs_attachments',
      entityRef: buildEntityRef({ schema: 'case_mgmt', table: 'cfs_attachments', id: attachmentId }),
      meta: { cfs_id: cfsId, file_name: attachment.file_name },
    });

    revalidatePath(cfsDetailPath(cfsId));
    return actionOk({ attachmentId, message: 'Attachment deleted.' });
  } catch (error) {
    console.error('deleteCfsAttachmentAction error', error);
    return actionError(error instanceof Error ? error.message : 'Unable to delete attachment.');
  }
}
