import type { LucideIcon } from 'lucide-react';
import { Boxes, Globe2, Megaphone, Notebook, Users2 } from 'lucide-react';

const APP_ICON_MAP = {
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
