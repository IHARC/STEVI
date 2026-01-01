'use server';

import { createCfsCallAction as createCfsCallActionImpl } from '@/lib/cfs/actions/create';
import { triageCfsAction as triageCfsActionImpl, verifyCfsAction as verifyCfsActionImpl } from '@/lib/cfs/actions/triage';
import {
  dismissCfsAction as dismissCfsActionImpl,
  markDuplicateCfsAction as markDuplicateCfsActionImpl,
  convertCfsToIncidentAction as convertCfsToIncidentActionImpl,
} from '@/lib/cfs/actions/resolution';
import {
  shareCfsWithOrgAction as shareCfsWithOrgActionImpl,
  revokeCfsOrgAccessAction as revokeCfsOrgAccessActionImpl,
  transferCfsOwnershipAction as transferCfsOwnershipActionImpl,
} from '@/lib/cfs/actions/access';
import {
  enablePublicTrackingAction as enablePublicTrackingActionImpl,
  disablePublicTrackingAction as disablePublicTrackingActionImpl,
} from '@/lib/cfs/actions/public-tracking';
import { addCfsNoteAction as addCfsNoteActionImpl, updateCfsStatusAction as updateCfsStatusActionImpl } from '@/lib/cfs/actions/status';
import { uploadCfsAttachmentAction as uploadCfsAttachmentActionImpl, deleteCfsAttachmentAction as deleteCfsAttachmentActionImpl } from '@/lib/cfs/actions/attachments';

export async function createCfsCallAction(...args: Parameters<typeof createCfsCallActionImpl>) {
  return createCfsCallActionImpl(...args);
}

export async function triageCfsAction(...args: Parameters<typeof triageCfsActionImpl>) {
  return triageCfsActionImpl(...args);
}

export async function verifyCfsAction(...args: Parameters<typeof verifyCfsActionImpl>) {
  return verifyCfsActionImpl(...args);
}

export async function dismissCfsAction(...args: Parameters<typeof dismissCfsActionImpl>) {
  return dismissCfsActionImpl(...args);
}

export async function markDuplicateCfsAction(...args: Parameters<typeof markDuplicateCfsActionImpl>) {
  return markDuplicateCfsActionImpl(...args);
}

export async function convertCfsToIncidentAction(...args: Parameters<typeof convertCfsToIncidentActionImpl>) {
  return convertCfsToIncidentActionImpl(...args);
}

export async function shareCfsWithOrgAction(...args: Parameters<typeof shareCfsWithOrgActionImpl>) {
  return shareCfsWithOrgActionImpl(...args);
}

export async function revokeCfsOrgAccessAction(...args: Parameters<typeof revokeCfsOrgAccessActionImpl>) {
  return revokeCfsOrgAccessActionImpl(...args);
}

export async function transferCfsOwnershipAction(...args: Parameters<typeof transferCfsOwnershipActionImpl>) {
  return transferCfsOwnershipActionImpl(...args);
}

export async function enablePublicTrackingAction(...args: Parameters<typeof enablePublicTrackingActionImpl>) {
  return enablePublicTrackingActionImpl(...args);
}

export async function disablePublicTrackingAction(...args: Parameters<typeof disablePublicTrackingActionImpl>) {
  return disablePublicTrackingActionImpl(...args);
}

export async function addCfsNoteAction(...args: Parameters<typeof addCfsNoteActionImpl>) {
  return addCfsNoteActionImpl(...args);
}

export async function updateCfsStatusAction(...args: Parameters<typeof updateCfsStatusActionImpl>) {
  return updateCfsStatusActionImpl(...args);
}

export async function uploadCfsAttachmentAction(...args: Parameters<typeof uploadCfsAttachmentActionImpl>) {
  return uploadCfsAttachmentActionImpl(...args);
}

export async function deleteCfsAttachmentAction(...args: Parameters<typeof deleteCfsAttachmentActionImpl>) {
  return deleteCfsAttachmentActionImpl(...args);
}
