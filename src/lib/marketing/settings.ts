export const MARKETING_SETTINGS_KEYS = {
  navItems: 'marketing.nav.items',
  navPortalCtaLabel: 'marketing.nav.portal_cta_label',
  hero: 'marketing.hero',
  contextCards: 'marketing.home.context_cards',
  supportsUrgent: 'marketing.supports.urgent',
  supportsMutualAid: 'marketing.supports.mutual_aid',
  programs: 'marketing.programs',
  footerPrimary: 'marketing.footer.primary_text',
  footerSecondary: 'marketing.footer.secondary_text',
} as const;

export type NavItem = { label: string; href: string };

export type HeroContent = {
  pill: string;
  headline: string;
  body: string;
  supporting: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  primaryCta: { label: string; href: string; analytics?: Record<string, unknown> | null };
  secondaryLink: { label: string; href: string; analytics?: Record<string, unknown> | null } | null;
};

export type ContextCard = { id: string; title: string; description: string; href: string };

export type SupportContact = { label: string; href: string | null };

export type SupportEntry = {
  title: string;
  summary: string;
  body: string;
  contacts: SupportContact[];
};

export type ProgramEntry = { title: string; description: string };

export function parseJsonSetting<T>(value: string | null, key: string): T {
  if (!value) {
    throw new Error(`Missing required setting ${key}`);
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Invalid JSON for ${key}: ${(error as Error).message}`);
  }
}

export function assertNonEmpty(value: string | null | undefined, field: string): string {
  if (!value || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}
