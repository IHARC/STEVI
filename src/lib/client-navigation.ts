import type { NavSection } from '@/lib/nav-types';

const CLIENT_NAV_SECTIONS: NavSection[] = [
  {
    id: 'client-portal',
    label: 'Client portal',
    description: 'Home, support, records, and profile',
    area: 'client',
    groups: [
      {
        id: 'client-home',
        label: 'Overview',
        items: [
          { id: 'client-home', href: '/home', label: 'Today', icon: 'home', match: ['/home'] },
          { id: 'client-appointments', href: '/appointments', label: 'Appointments', icon: 'calendar', match: ['/appointments'] },
        ],
      },
      {
        id: 'client-support',
        label: 'Care & support',
        items: [
          { id: 'client-cases', href: '/cases', label: 'My cases', icon: 'briefcase', match: ['/cases'] },
          { id: 'client-support-requests', href: '/support', label: 'Support requests', icon: 'lifebuoy', match: ['/support'] },
          { id: 'client-messages', href: '/messages', label: 'Messages', icon: 'message', match: ['/messages'] },
        ],
      },
      {
        id: 'client-records',
        label: 'Records',
        items: [
          { id: 'client-documents', href: '/documents', label: 'Documents', icon: 'file', match: ['/documents'] },
          { id: 'client-resources', href: '/resources', label: 'Resources', icon: 'book', match: ['/resources'] },
        ],
      },
      {
        id: 'client-profile',
        label: 'Profile & consents',
        items: [
          { id: 'client-profile', href: '/profile', label: 'Profile', icon: 'settings', exact: true },
          { id: 'client-consents', href: '/profile/consents', label: 'Consents', icon: 'shield', match: ['/profile/consents'] },
        ],
      },
    ],
  },
];

export function buildClientNav(): NavSection[] {
  return CLIENT_NAV_SECTIONS;
}
