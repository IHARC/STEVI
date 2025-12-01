import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  Clock3,
  FileText,
  Flame,
  FlaskConical,
  Globe2,
  Home,
  IdCard,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  MapPinned,
  Megaphone,
  MessageCircle,
  Notebook,
  Package,
  Route,
  Settings2,
  ShieldCheck,
  Tent,
  Users2,
  Workflow,
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
  calendar: CalendarClock,
  calendarRange: CalendarRange,
  lifebuoy: LifeBuoy,
  message: MessageCircle,
  book: BookOpen,
  file: FileText,
  inbox: Inbox,
  list: ListChecks,
  route: Route,
  tent: Tent,
  map: MapPinned,
  clock: Clock3,
  idCard: IdCard,
  box: Package,
  lab: FlaskConical,
  approval: ClipboardCheck,
  workflow: Workflow,
  flame: Flame,
} as const satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof APP_ICON_MAP;

export function resolveAppIcon(name: AppIconName): LucideIcon {
  const icon = APP_ICON_MAP[name];

  if (!icon) {
    throw new Error(`Unknown app icon "${name}"`);
  }

  return icon;
}
