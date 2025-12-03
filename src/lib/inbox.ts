import type { SupabaseAnyServerClient } from '@/lib/supabase/types';
import type { PortalAccess } from '@/lib/portal-access';
import type { PortalArea } from '@/lib/portal-navigation';
import { fetchClientAppointments } from '@/lib/appointments/queries';
import { listClientDocuments } from '@/lib/documents';
import { fetchStaffCaseload, fetchStaffShifts } from '@/lib/staff/fetchers';
import { fetchPendingIntakes } from '@/lib/cases/fetchers';
import { fetchOrgInvites, fetchOrgMembersWithRoles } from '@/lib/org/fetchers';

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

async function fetchStaffInboxItems(
  supabase: SupabaseAnyServerClient,
  access: PortalAccess,
): Promise<InboxItem[]> {
  const items: InboxItem[] = [];

  try {
    const caseload = await fetchStaffCaseload(supabase, access.userId);
    caseload
      .filter((entry) => entry.nextStep || entry.nextAt)
      .slice(0, 3)
      .forEach((entry) => {
        items.push({
          id: `case-${entry.id}`,
          title: entry.clientName ?? 'Client case',
          description: entry.nextStep ?? 'Next action pending',
          href: '/staff/cases',
          tone: entry.nextAt ? 'warning' : 'info',
          badge: entry.nextAt ? 'Due soon' : 'Follow-up',
          meta: entry.nextAt ? { due: entry.nextAt } : undefined,
        });
      });
  } catch (error) {
    console.warn('Unable to load staff inbox caseload', error);
  }

  try {
    const shifts = await fetchStaffShifts(supabase, access.userId);
    const nextShift = shifts.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))[0];
    if (nextShift) {
      items.push({
        id: `shift-${nextShift.id}`,
        title: nextShift.title || 'Upcoming shift',
        description: nextShift.location,
        href: '/staff/schedule',
        tone: 'success',
        badge: `${nextShift.startsAt}–${nextShift.endsAt}`.trim(),
      });
    }
  } catch (error) {
    console.warn('Unable to load staff inbox shifts', error);
  }

  try {
    const intakes = await fetchPendingIntakes(supabase);
    intakes.slice(0, 2).forEach((intake) => {
      items.push({
        id: `intake-${intake.id}`,
        title: 'New intake submission',
        description: intake.chosenName || 'New client',
        href: '/staff/intake',
        tone: 'warning',
        badge: 'Review',
      });
    });
  } catch (error) {
    console.warn('Unable to load staff inbox intakes', error);
  }

  return items.slice(0, 8);
}

async function fetchOrgInboxItems(
  supabase: SupabaseAnyServerClient,
  access: PortalAccess,
): Promise<InboxItem[]> {
  const items: InboxItem[] = [];
  if (!access.organizationId) return items;

  try {
    const invites = await fetchOrgInvites(supabase, access.organizationId, 10);
    invites
      .filter((invite) => invite.status === 'pending')
      .slice(0, 3)
      .forEach((invite) => {
        items.push({
          id: `invite-${invite.id}`,
          title: invite.display_name ?? invite.email,
          description: 'Pending organization invite',
          href: '/org/invites',
          tone: 'warning',
          badge: 'Pending',
        });
      });
  } catch (error) {
    console.warn('Unable to load org inbox invites', error);
  }

  try {
    const members = await fetchOrgMembersWithRoles(supabase, access.organizationId);
    const needsApproval = members.filter((member) => member.affiliation_status === 'pending').slice(0, 3);
    needsApproval.forEach((member) => {
      items.push({
        id: `member-${member.id}`,
        title: member.display_name ?? 'Member approval',
        description: 'Approve or decline member access',
        href: '/org/members',
        tone: 'warning',
        badge: 'Approval',
      });
    });
  } catch (error) {
    console.warn('Unable to load org inbox members', error);
  }

  return items.slice(0, 8);
}

async function fetchAdminInboxItems(
  supabase: SupabaseAnyServerClient,
): Promise<InboxItem[]> {
  const items: InboxItem[] = [];

  try {
    const portal = supabase.schema('portal');
    const caseMgmt = supabase.schema('case_mgmt');
    const [pendingProfiles, pendingInvites, notifications, openCases] = await Promise.all([
      portal.from('profiles').select('id', { count: 'exact', head: true }).eq('affiliation_status', 'pending'),
      portal.from('profile_invites').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      portal.from('notifications').select('id', { count: 'exact', head: true }).is('acknowledged_at', null),
      caseMgmt.from('case_management').select('id', { count: 'exact', head: true }).not('status', 'eq', 'closed'),
    ]);

    if ((pendingProfiles.count ?? 0) > 0) {
      items.push({
        id: 'admin-profiles',
        title: 'Profile approvals',
        description: `${pendingProfiles.count} pending profiles`,
        href: '/admin/profiles',
        tone: 'warning',
        badge: 'Review',
      });
    }

    if ((pendingInvites.count ?? 0) > 0) {
      items.push({
        id: 'admin-invites',
        title: 'Pending invites',
        description: `${pendingInvites.count} invites awaiting action`,
        href: '/admin/profiles',
        tone: 'info',
        badge: 'Invites',
      });
    }

    if ((notifications.count ?? 0) > 0) {
      items.push({
        id: 'admin-notifications',
        title: 'Unacknowledged notifications',
        description: `${notifications.count} queued/sent notifications`,
        href: '/admin/notifications',
        tone: 'info',
        badge: 'Notifications',
      });
    }

    if ((openCases.count ?? 0) > 0) {
      items.push({
        id: 'admin-cases',
        title: 'Open cases',
        description: `${openCases.count} cases open`,
        href: '/admin/appointments',
        tone: 'info',
        badge: 'Cases',
      });
    }
  } catch (error) {
    console.warn('Unable to load admin inbox', error);
  }

  return items.slice(0, 8);
}

export async function fetchPortalInbox(
  supabase: SupabaseAnyServerClient,
  access: PortalAccess,
  area: PortalArea,
): Promise<InboxItem[]> {
  if (area === 'staff') {
    return fetchStaffInboxItems(supabase, access);
  }

  if (area === 'org') {
    return fetchOrgInboxItems(supabase, access);
  }

  if (area === 'admin') {
    return fetchAdminInboxItems(supabase);
  }

  return fetchClientInboxItems(supabase, access);
}
