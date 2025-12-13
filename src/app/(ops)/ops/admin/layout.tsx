import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getPortalRequestContext } from '@shared/providers/portal-request-context';
import { requireArea } from '@/lib/portal-areas';
import { SettingsShell } from '@shared/layout/settings-shell';
import type { SettingsNavGroup } from '@shared/layout/settings-nav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { portalAccess, landingPath, currentPath } = await getPortalRequestContext();
  const accessCheck = requireArea(portalAccess, 'ops_admin', { currentPath, landingPath });
  if (!accessCheck.allowed) {
    redirect(accessCheck.redirectPath);
  }

  const nav: SettingsNavGroup[] = [
    {
      label: 'STEVI Admin',
      items: [
        { label: 'General settings', href: '/ops/admin', match: ['/ops/admin'] },
        {
          label: 'People & consent',
          href: '/ops/admin/people',
          match: ['/ops/admin/people', '/ops/admin/clients', '/ops/admin/consents'],
          items: [
            { label: 'People', href: '/ops/admin/people', match: ['/ops/admin/people'] },
            { label: 'Clients', href: '/ops/admin/clients', match: ['/ops/admin/clients'] },
            { label: 'Consents', href: '/ops/admin/consents', match: ['/ops/admin/consents'] },
          ],
        },
        { label: 'Organizations', href: '/ops/admin/organizations', match: ['/ops/admin/organizations'] },
        {
          label: 'Users & access',
          href: '/ops/admin/users/all',
          match: ['/ops/admin/users', '/ops/admin/profiles', '/ops/admin/permissions'],
          items: [
            { label: 'Users (all)', href: '/ops/admin/users/all', match: ['/ops/admin/users/all'] },
            { label: 'Users (clients)', href: '/ops/admin/users/clients', match: ['/ops/admin/users/clients'] },
            { label: 'Users (partners)', href: '/ops/admin/users/partners', match: ['/ops/admin/users/partners'] },
            { label: 'Users (staff)', href: '/ops/admin/users/staff', match: ['/ops/admin/users/staff'] },
            { label: 'Profiles', href: '/ops/admin/profiles', match: ['/ops/admin/profiles'] },
            { label: 'Permissions', href: '/ops/admin/permissions', match: ['/ops/admin/permissions'] },
          ],
        },
        {
          label: 'Content & comms',
          href: '/ops/admin/content',
          match: [
            '/ops/admin/content',
            '/ops/admin/notifications',
            '/ops/admin/resources',
            '/ops/admin/policies',
            '/ops/admin/marketing',
            '/ops/admin/help',
            '/ops/admin/content-inventory',
          ],
          items: [
            { label: 'Content & notifications', href: '/ops/admin/content', match: ['/ops/admin/content'] },
            { label: 'Notifications', href: '/ops/admin/notifications', match: ['/ops/admin/notifications'] },
            { label: 'Resources', href: '/ops/admin/resources', match: ['/ops/admin/resources'] },
            { label: 'Policies', href: '/ops/admin/policies', match: ['/ops/admin/policies'] },
            { label: 'Marketing', href: '/ops/admin/marketing', match: ['/ops/admin/marketing'] },
            { label: 'Help', href: '/ops/admin/help', match: ['/ops/admin/help'] },
            { label: 'Content inventory', href: '/ops/admin/content-inventory', match: ['/ops/admin/content-inventory'] },
            {
              label: 'Website & marketing',
              href: '/ops/admin/website/branding',
              match: ['/ops/admin/website'],
              items: [
                { label: 'Branding', href: '/ops/admin/website/branding', match: ['/ops/admin/website/branding'] },
                { label: 'Navigation', href: '/ops/admin/website/navigation', match: ['/ops/admin/website/navigation'] },
                { label: 'Home', href: '/ops/admin/website/home', match: ['/ops/admin/website/home'] },
                { label: 'Supports', href: '/ops/admin/website/supports', match: ['/ops/admin/website/supports'] },
                { label: 'Programs', href: '/ops/admin/website/programs', match: ['/ops/admin/website/programs'] },
                { label: 'Footer', href: '/ops/admin/website/footer', match: ['/ops/admin/website/footer'] },
                { label: 'Content inventory', href: '/ops/admin/website/inventory', match: ['/ops/admin/website/inventory'] },
                { label: 'Fundraising', href: '/ops/admin/website/fundraising', match: ['/ops/admin/website/fundraising'] },
              ],
            },
          ],
        },
        { label: 'Inventory & donations', href: '/ops/admin/inventory', match: ['/ops/admin/inventory'] },
        {
          label: 'Operations',
          href: '/ops/admin/operations',
          match: [
            '/ops/admin/operations',
            '/ops/admin/approvals',
            '/ops/admin/appointments',
            '/ops/admin/service-rules',
            '/ops/admin/templates',
            '/ops/admin/warming-room',
          ],
          items: [
            { label: 'Attention queue', href: '/ops/admin/operations', match: ['/ops/admin/operations'] },
            { label: 'Approvals', href: '/ops/admin/approvals', match: ['/ops/admin/approvals'] },
            { label: 'Appointments', href: '/ops/admin/appointments', match: ['/ops/admin/appointments'] },
            { label: 'Service rules', href: '/ops/admin/service-rules', match: ['/ops/admin/service-rules'] },
            { label: 'Templates', href: '/ops/admin/templates', match: ['/ops/admin/templates'] },
            { label: 'Warming room', href: '/ops/admin/warming-room', match: ['/ops/admin/warming-room'] },
          ],
        },
      ],
    },
  ];

  return <SettingsShell nav={nav}>{children}</SettingsShell>;
}
