import type { Database } from '@/types/supabase';

export type NotificationRecord = {
  id: string;
  profileId: string | null;
  profileName: string | null;
  recipientEmail: string | null;
  recipientPhone?: string | null;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  notificationType: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
};

export type NotificationRecipient = {
  id: string;
  displayName: string;
  email: string | null;
  affiliation: Database['portal']['Enums']['affiliation_type'];
  organizationName: string | null;
};
