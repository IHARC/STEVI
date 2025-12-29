import type { Database } from '@/types/supabase';
import { formatEnumLabel } from '@/lib/enum-values';

export type CfsStatus = Database['core']['Enums']['cfs_status_enum'];
export type CfsOrigin = Database['core']['Enums']['cfs_origin_enum'];
export type CfsSource = Database['core']['Enums']['cfs_source_enum'];
export type CfsPublicCategory = Database['core']['Enums']['cfs_public_category_enum'];
export type CfsPublicStatus = Database['core']['Enums']['cfs_public_status_enum'];
export type NotifyChannel = Database['core']['Enums']['notify_channel_enum'];
export type CfsAccessLevel = Database['core']['Enums']['cfs_access_level_enum'];
export type IncidentType = Database['core']['Enums']['incident_type_enum'];
export type IncidentPriority = Database['core']['Enums']['incident_priority_enum'];
export type DispatchPriority = Database['core']['Enums']['dispatch_priority_enum'];

export const CFS_ATTACHMENTS_BUCKET = 'cfs-attachments';
export const CFS_STATUS_OPTIONS: CfsStatus[] = ['received', 'triaged', 'dismissed', 'converted'];
export const CFS_ORIGIN_OPTIONS: CfsOrigin[] = ['community', 'system'];
export const CFS_SOURCE_OPTIONS: CfsSource[] = ['web_form', 'phone', 'sms', 'email', 'social', 'api', 'staff_observed'];
export const CFS_ACCESS_LEVEL_OPTIONS: CfsAccessLevel[] = ['view', 'collaborate', 'dispatch'];
export const NOTIFY_CHANNEL_OPTIONS: NotifyChannel[] = ['none', 'email', 'sms'];

export const REPORT_METHOD_OPTIONS = [
  'phone',
  'walk_in',
  'social_media',
  'email',
  'radio',
  'agency_transfer',
  'online_form',
] as const;

export type ReportMethod = (typeof REPORT_METHOD_OPTIONS)[number];

export const REPORT_PRIORITY_OPTIONS = ['immediate', 'urgent', 'routine', 'informational'] as const;
export type ReportPriority = (typeof REPORT_PRIORITY_OPTIONS)[number];

export const VERIFICATION_STATUS_OPTIONS = ['pending', 'verified', 'unverified', 'unable_to_verify'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS_OPTIONS)[number];

export const VERIFICATION_METHOD_OPTIONS = ['callback', 'field_check', 'agency_confirm', 'cross_reference', 'none_required'] as const;
export type VerificationMethod = (typeof VERIFICATION_METHOD_OPTIONS)[number];

export const REPORT_STATUS_OPTIONS = ['active', 'escalated', 'resolved', 'duplicate', 'false_alarm', 'archived'] as const;
export type ReportStatus = (typeof REPORT_STATUS_OPTIONS)[number];

export const PUBLIC_CATEGORY_OPTIONS: CfsPublicCategory[] = [
  'cleanup',
  'outreach',
  'welfare_check',
  'supply_distribution',
  'other',
];

export const PUBLIC_STATUS_OPTIONS: CfsPublicStatus[] = [
  'received',
  'triaged',
  'dispatched',
  'in_progress',
  'resolved',
];

export const INCIDENT_TYPE_OPTIONS: IncidentType[] = [
  'outreach',
  'welfare_check',
  'medical',
  'mental_health',
  'mental_health_crisis',
  'overdose',
  'death',
  'assault',
  'theft',
  'disturbance',
  'property_damage',
  'fire',
  'cleanup',
  'supply_distribution',
  'other',
];

export const INCIDENT_PRIORITY_OPTIONS: IncidentPriority[] = ['low', 'medium', 'high', 'critical'];
export const DISPATCH_PRIORITY_OPTIONS: DispatchPriority[] = ['informational', 'low', 'medium', 'high', 'critical'];

export const CFS_STATUS_TONES: Record<CfsStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  received: 'info',
  triaged: 'warning',
  dismissed: 'neutral',
  converted: 'success',
};

export const PUBLIC_STATUS_TONES: Record<CfsPublicStatus, 'info' | 'warning' | 'success' | 'neutral'> = {
  received: 'info',
  triaged: 'warning',
  dispatched: 'info',
  in_progress: 'warning',
  resolved: 'success',
};

export function formatCfsLabel(value: string | null | undefined): string {
  if (!value) return 'Unknown';
  return formatEnumLabel(value);
}

export function formatReportStatus(value: string | null | undefined): string {
  if (!value) return 'Active';
  return formatEnumLabel(value);
}
