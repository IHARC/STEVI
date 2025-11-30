import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  Building2,
  Globe2,
  Home,
  LayoutDashboard,
  Megaphone,
  Notebook,
  Settings2,
  ShieldCheck,
  Users2,
} from 'lucide-react';

const APP_ICON_MAP = {
  home: Home,
  dashboard: LayoutDashboard,
  shield: ShieldCheck,
  chart: BarChart3,
  settings: Settings2,
  building: Building2,
  briefcase: BriefcaseBusiness,
  users: Users2,
  notebook: Notebook,
  globe: Globe2,
  megaphone: Megaphone,
  boxes: Boxes,
} as const satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof APP_ICON_MAP;

export function resolveAppIcon(name: AppIconName): LucideIcon {
  const icon = APP_ICON_MAP[name];

  if (!icon) {
    throw new Error(`Unknown app icon "${name}"`);
  }

  return icon;
}
