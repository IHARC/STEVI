import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { PortalAccess } from '@/lib/portal-access';
import { fetchClientAppointments } from '@/lib/appointments/queries';
import { listClientDocuments } from '@/lib/documents';

export type InboxItemTone = 'info' | 'warning' | 'success' | 'critical';

export type InboxItem = {
  id: string;
  title: string;
  description?: string;
  href: string;
  tone?: InboxItemTone;
  badge?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

export async function fetchClientInboxItems(
  supabase: SupabaseAnyServerClient,
  access: PortalAccess,
): Promise<InboxItem[]> {
  const items: InboxItem[] = [];

  // Upcoming appointments
  try {
    const { upcoming } = await fetchClientAppointments(supabase, access.profile.id);
    upcoming
      .slice(0, 3)
      .forEach((appt) => {
        const when = appt.occurs_at ?? appt.created_at;
        const badge = appt.status?.replaceAll('_', ' ');
        items.push({
          id: `appt-${appt.id}`,
          title: appt.title ?? 'Appointment',
          description: when ? new Date(when).toLocaleString() : 'Awaiting time',
          href: '/appointments',
          tone: appt.status === 'scheduled' ? 'success' : 'info',
          badge,
        });
      });
  } catch (error) {
    console.warn('Unable to load inbox appointments', error);
  }

  // Documents nearing expiry
  try {
    const docs = await listClientDocuments(access.profile.id);
    docs
      .filter((doc) => doc.expiresAt)
      .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime())
      .slice(0, 3)
      .forEach((doc) => {
        const expiresInMs = new Date(doc.expiresAt as string).getTime() - Date.now();
        const days = Math.max(0, Math.ceil(expiresInMs / (1000 * 60 * 60 * 24)));
        items.push({
          id: `doc-${doc.path}`,
          title: doc.name,
          description: doc.expiresAt ? `Expires in ${days} day${days === 1 ? '' : 's'}` : undefined,
          href: '/documents',
          tone: days <= 3 ? 'warning' : 'info',
          badge: 'Document',
        });
      });
  } catch (error) {
    console.warn('Unable to load inbox documents', error);
  }

  // Unacknowledged notifications
  try {
    const { data, error } = await supabase
      .schema('portal')
      .from('notifications')
      .select('id, subject, status, created_at')
      .eq('profile_id', access.profile.id)
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error) {
      (data ?? []).forEach((notification: { id: string; subject: string | null; status: string | null }) => {
        items.push({
          id: `notif-${notification.id}`,
          title: notification.subject ?? 'Notification',
          description: notification.status ?? undefined,
          href: '/support',
          tone: 'info',
          badge: 'Notification',
        });
      });
    }
  } catch (error) {
    console.warn('Unable to load inbox notifications', error);
  }

  return items.slice(0, 8);
}

export async function fetchWorkspaceInbox(
  supabase: SupabaseAnyServerClient,
  access: PortalAccess,
  _workspace: 'client' | 'staff' | 'org' | 'admin',
): Promise<InboxItem[]> {
  // For now reuse client-centric inbox to surface time-sensitive items; extend per workspace later.
  return fetchClientInboxItems(supabase, access);
}
