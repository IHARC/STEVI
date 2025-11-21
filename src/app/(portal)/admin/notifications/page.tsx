import { redirect } from 'next/navigation';
import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import { ensurePortalProfile } from '@/lib/profile';
import { getPortalRoles } from '@/lib/ihar-auth';
import { ComposeNotificationForm } from '@/components/admin/notifications/compose-form';
import { RecentNotifications } from '@/components/admin/notifications/recent-notifications';
import type {
  NotificationRecipient,
  NotificationRecord,
} from '@/components/admin/notifications/types';
import type { Database } from '@/types/supabase';

type MaybeArray<T> = T | T[] | null;

type OrganizationRelation = Pick<Database['portal']['Tables']['organizations']['Row'], 'name'>;
type ContactRelation = Pick<
  Database['portal']['Tables']['profile_contacts']['Row'],
  'contact_type' | 'contact_value'
>;

type RecipientRow = Pick<
  Database['portal']['Tables']['profiles']['Row'],
  'id' | 'display_name' | 'affiliation_type'
> & {
  organization: MaybeArray<OrganizationRelation>;
  contacts: MaybeArray<ContactRelation>;
};

type NotificationRow = Database['portal']['Tables']['notifications']['Row'] & {
  profile: MaybeArray<Pick<Database['portal']['Tables']['profiles']['Row'], 'display_name'>>;
};

export const dynamic = 'force-dynamic';

export default async function NotificationsAdminPage() {
  const supabase = await createSupabaseRSCClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin/notifications');
  }

  const portalRoles = getPortalRoles(user);
  if (!portalRoles.includes('portal_admin')) {
    redirect('/home');
  }

  await ensurePortalProfile(supabase, user.id);
  const portal = supabase.schema('portal');

  const [profilesResponse, notificationsResponse] = await Promise.all([
    portal
      .from('profiles')
      .select(
        `
          id,
          display_name,
          affiliation_type,
          organization:organizations(name),
          contacts:profile_contacts(contact_type, contact_value)
        `,
      )
      .order('display_name'),
    portal
      .from('notifications')
      .select(
        `
          id,
          profile_id,
          recipient_email,
          subject,
          body_text,
          body_html,
          notification_type,
          status,
          created_at,
          sent_at,
          profile:profiles(display_name)
        `,
      )
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (profilesResponse.error) {
    throw profilesResponse.error;
  }
  if (notificationsResponse.error) {
    throw notificationsResponse.error;
  }

  const recipientRows = (profilesResponse.data ?? []) as RecipientRow[];
  const recipients: NotificationRecipient[] = recipientRows.map((row) => {
    const contacts = Array.isArray(row.contacts)
      ? row.contacts
      : row.contacts
        ? [row.contacts]
        : [];
    const emailContact = contacts.find((contact) => contact.contact_type === 'email');
    const organizationRelation = Array.isArray(row.organization)
      ? row.organization[0]
      : row.organization ?? null;
    return {
      id: row.id,
      displayName: row.display_name,
      email: emailContact?.contact_value ?? null,
      affiliation: row.affiliation_type,
      organizationName: organizationRelation?.name ?? null,
    };
  });

  const notificationRows = (notificationsResponse.data ?? []) as NotificationRow[];
  const notifications: NotificationRecord[] = notificationRows.map((row) => {
    const profileRelation = Array.isArray(row.profile) ? row.profile[0] : row.profile ?? null;
    return {
      id: row.id,
      profileId: row.profile_id,
      profileName: profileRelation?.display_name ?? null,
      recipientEmail: row.recipient_email,
      subject: row.subject,
      bodyText: row.body_text,
      bodyHtml: row.body_html,
      notificationType: row.notification_type,
      status: row.status,
      createdAt: row.created_at,
      sentAt: row.sent_at,
    };
  });

  return (
    <div className="page-shell page-stack">
      <header className="flex flex-col gap-space-xs">
        <p className="text-label-sm font-medium uppercase text-muted-foreground">
          Outreach messaging
        </p>
        <h1 className="text-headline-lg text-on-surface sm:text-display-sm">Notifications workspace</h1>
        <p className="max-w-3xl text-body-md text-muted-foreground sm:text-body-lg">
          Send reminders and alerts that respect each neighbour’s consent preferences. Delivery runs
          through Supabase notifications and the existing portal-alerts Edge Function.
        </p>
      </header>

      <ComposeNotificationForm recipients={recipients} />

      <RecentNotifications notifications={notifications} />
    </div>
  );
}
