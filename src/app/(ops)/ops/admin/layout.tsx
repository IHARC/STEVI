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
        { label: 'Organizations', href: '/ops/admin/organizations', match: ['/ops/admin/organizations'] },
        { label: 'Users & access', href: '/ops/admin/users/all', match: ['/ops/admin/users'] },
        { label: 'Content & comms', href: '/ops/admin/content', match: ['/ops/admin/content'] },
        {
          label: 'Integrations & AI',
          href: '/ops/admin/integrations',
          match: ['/ops/admin/integrations'],
          items: [
            { label: 'AI & system', href: '/ops/admin/integrations', match: ['/ops/admin/integrations'] },
            { label: 'Donations (Stripe)', href: '/ops/admin/integrations/donations', match: ['/ops/admin/integrations/donations'] },
          ],
        },
        {
          label: 'Website & marketing',
          href: '/ops/admin/website',
          match: ['/ops/admin/website'],
          items: [
            { label: 'Branding', href: '/ops/admin/website/branding', match: ['/ops/admin/website/branding'] },
            { label: 'Navigation', href: '/ops/admin/website/navigation', match: ['/ops/admin/website/navigation'] },
            { label: 'Home', href: '/ops/admin/website/home', match: ['/ops/admin/website/home'] },
            { label: 'Supports', href: '/ops/admin/website/supports', match: ['/ops/admin/website/supports'] },
            { label: 'Programs', href: '/ops/admin/website/programs', match: ['/ops/admin/website/programs'] },
            { label: 'Footer', href: '/ops/admin/website/footer', match: ['/ops/admin/website/footer'] },
            { label: 'Content inventory', href: '/ops/admin/website/inventory', match: ['/ops/admin/website/inventory'] },
          ],
        },
        { label: 'Operations', href: '/ops/admin/operations', match: ['/ops/admin/operations'] },
      ],
    },
  ];

  return <SettingsShell nav={nav}>{children}</SettingsShell>;
}
