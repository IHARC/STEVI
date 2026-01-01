import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadPortalAccess } from '@/lib/portal-access';
import { zodRequiredNumber } from '@/lib/server-actions/validate';
import type { ActionState } from '@/lib/server-actions/validate';
import type { Database } from '@/types/supabase';

export const CFS_LIST_PATH = '/ops/cfs';
export const cfsDetailPath = (cfsId: number | string) => `/ops/cfs/${cfsId}`;
export const incidentDetailPath = (incidentId: number | string) => `/ops/incidents/${incidentId}`;
export const MAX_CFS_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export async function loadActionAccess(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  return loadPortalAccess(supabase, { allowSideEffects: true });
}

export type CfsActionData = {
  cfsId?: number;
  incidentId?: number;
  trackingId?: string;
  message?: string;
};

export type CfsActionState = ActionState<CfsActionData>;

export const initialCfsActionState: CfsActionState = { status: 'idle' };

export type CfsAttachmentActionData = {
  attachmentId?: string;
  message?: string;
};

export type CfsAttachmentActionState = ActionState<CfsAttachmentActionData>;

export const initialCfsAttachmentActionState: CfsAttachmentActionState = { status: 'idle' };

export type NotifySummary = {
  notify_opt_in: boolean | null;
  notify_channel: Database['core']['Enums']['notify_channel_enum'] | null;
  notify_target: string | null;
  report_number: string;
  public_tracking_id: string | null;
};

export const enumOrUndefined = <T extends string>(options: readonly T[]) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    },
    z.enum(options as [T, ...T[]]).optional(),
  );

export const enumWithDefault = <T extends string>(options: readonly T[], fallback: T) =>
  enumOrUndefined(options).transform((value) => value ?? fallback);

export const requiredId = (label: string) => zodRequiredNumber(label, { int: true, positive: true });

export function parseOptionalDatetime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function parseUrgencyIndicators(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function normalizeEmailTarget(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

export function normalizePhoneTarget(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return hasPlus ? `+${digits}` : digits;
}

export function normalizeNotifyTarget(channel: 'email' | 'sms', value: string | null): string | null {
  return channel === 'sms' ? normalizePhoneTarget(value) : normalizeEmailTarget(value);
}
