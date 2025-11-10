import type { PortalLink } from '@/lib/portal-access';
import { PortalNavClient } from '@/components/layout/portal-nav-client';

type PortalNavProps = {
  links: PortalLink[];
};

export function PortalNav({ links }: PortalNavProps) {
  if (links.length === 0) {
    return null;
  }

  return <PortalNavClient links={links} />;
}
