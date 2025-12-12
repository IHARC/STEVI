import type { AppIconName } from '@/lib/app-icons';
import type { PortalArea } from '@/lib/portal-areas';

export type NavItem = {
  id: string;
  href: string;
  label: string;
  icon?: AppIconName;
  match?: string[];
  exact?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  description?: string;
  icon?: AppIconName;
  isHub?: boolean;
  items: NavItem[];
};

export type NavSection = {
  id: string;
  label: string;
  description?: string;
  area: PortalArea;
  groups: NavGroup[];
};
