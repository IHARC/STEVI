import { createSupabaseRSCClient } from '@/lib/supabase/rsc';
import type { Database, Json } from '@/types/supabase';

export const RESOURCE_KIND_LABELS = {
  delegation: 'Delegation',
  report: 'Report',
  presentation: 'Presentation',
  policy: 'Policy Brief',
  press: 'Press',
  dataset: 'Dataset',
  other: 'Other Resource',
} as const;

type ResourceKindMap = typeof RESOURCE_KIND_LABELS;

export type ResourceKind = keyof ResourceKindMap;

export type ResourceAttachment = {
  label: string;
  url: string;
};

export type ResourceEmbed =
  | { type: 'google-doc'; url: string }
  | { type: 'pdf'; url: string }
  | { type: 'video'; url: string; provider: 'youtube' | 'vimeo' }
  | { type: 'external'; url: string; label?: string }
  | { type: 'html'; html: string };

type ResourceRow = Database['portal']['Tables']['resource_pages']['Row'];
export type ResourceEmbedPlacement = Database['portal']['Enums']['resource_embed_placement'];

export type Resource = {
  id: string;
  slug: string;
  title: string;
  kind: ResourceKind;
  datePublished: string;
  summary?: string | null;
  location?: string | null;
  tags: string[];
  attachments: ResourceAttachment[];
  embed: ResourceEmbed | null;
  embedPlacement: ResourceEmbedPlacement;
  bodyHtml: string;
  isPublished: boolean;
  coverImage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const ALLOWED_EMBED_HOSTS = new Set([
  'docs.google.com',
  'drive.google.com',
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
  'player.vimeo.com',
  'vimeo.com',
  'iharc.ca',
]);

export type ResourceFilters = {
  q?: string | null;
  kind?: ResourceKind | null;
  tag?: string | null;
  year?: string | null;
};

type FetchOptions = {
  includeUnpublished?: boolean;
};

export type NormalizedResourceFilters = Required<ResourceFilters>;

export async function fetchResourceLibrary(options: FetchOptions = {}): Promise<Resource[]> {
  const supabase = await createSupabaseRSCClient();
  const portal = supabase.schema('portal');

  let query = portal
    .from('resource_pages')
    .select(
      `
        id,
        slug,
        title,
        kind,
        summary,
        location,
        date_published,
        tags,
        attachments,
        embed,
        embed_placement,
        body_html,
        is_published,
        cover_image,
        created_by_profile_id,
        updated_by_profile_id,
        created_at,
        updated_at
      `,
    )
    .order('date_published', { ascending: false })
    .order('created_at', { ascending: false });

  if (!options.includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ResourceRow[];
  return rows.map(mapResourceRow);
}

export async function listResources(
  filters: ResourceFilters = {},
  options: FetchOptions = {},
): Promise<Resource[]> {
  const dataset = await fetchResourceLibrary(options);
  return filterResources(dataset, filters);
}

export async function getResourceBySlug(
  slug: string,
  options: FetchOptions = {},
): Promise<Resource | null> {
  const supabase = await createSupabaseRSCClient();
  const portal = supabase.schema('portal');

  let query = portal
    .from('resource_pages')
    .select(
      `
        id,
        slug,
        title,
        kind,
        summary,
        location,
        date_published,
        tags,
        attachments,
        embed,
        embed_placement,
        body_html,
        is_published,
        cover_image,
        created_by_profile_id,
        updated_by_profile_id,
        created_at,
        updated_at
      `,
    )
    .eq('slug', slug)
    .limit(1);

  if (!options.includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query.maybeSingle<ResourceRow>();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapResourceRow(data);
}

export function normalizeFilters(filters: ResourceFilters): NormalizedResourceFilters {
  const normalized = {
    q: filters.q?.toString().trim() || null,
    kind: filters.kind ?? null,
    tag: filters.tag?.toString().trim() || null,
    year: filters.year?.toString().trim() || null,
  } as NormalizedResourceFilters;

  if (normalized.kind && !Object.hasOwn(RESOURCE_KIND_LABELS, normalized.kind)) {
    normalized.kind = null;
  }

  if (normalized.year && !/^\d{4}$/.test(normalized.year)) {
    normalized.year = null;
  }

  if (normalized.tag) {
    normalized.tag = normalized.tag.toLowerCase();
  }

  return normalized;
}

export function filterResources(dataset: Resource[], filters: ResourceFilters = {}): Resource[] {
  const { q, kind, tag, year } = normalizeFilters(filters);
  const searchTerm = q?.trim().toLowerCase();
  const tagFilter = tag?.toLowerCase();

  const items = dataset
    .filter((resource) => {
      if (!resource.isPublished) {
        return false;
      }

      if (kind && resource.kind !== kind) {
        return false;
      }

      if (year && !resource.datePublished.startsWith(year)) {
        return false;
      }

      if (tagFilter && !resource.tags.some((entry) => entry.toLowerCase() === tagFilter)) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const haystack = [
        resource.title,
        resource.summary ?? '',
        resource.location ?? '',
        resource.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(searchTerm);
    })
    .sort(
      (a, b) =>
        new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime() ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  return items;
}

export function getResourceYears(dataset: Resource[]): string[] {
  const years = new Set<string>();
  for (const resource of dataset) {
    if (resource.datePublished) {
      years.add(resource.datePublished.slice(0, 4));
    }
  }
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

export function getResourceTags(dataset: Resource[]): string[] {
  const tags = new Set<string>();
  for (const resource of dataset) {
    for (const tag of resource.tags) {
      tags.add(tag.toLowerCase());
    }
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

export function formatResourceDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function isAllowedEmbedUrl(rawUrl: string | URL) {
  try {
    const parsed = rawUrl instanceof URL ? rawUrl : new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_EMBED_HOSTS.has(hostname);
  } catch (error) {
    return false;
  }
}

export function assertAllowedEmbedUrl(rawUrl: string, context: string) {
  if (!isAllowedEmbedUrl(rawUrl)) {
    throw new Error(`Blocked embed host for ${context}`);
  }
  return rawUrl;
}

export function getKindLabel(kind: ResourceKind) {
  return RESOURCE_KIND_LABELS[kind];
}

export function normalizeResourceSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function mapResourceRow(row: ResourceRow): Resource {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind as ResourceKind,
    datePublished: row.date_published,
    summary: row.summary,
    location: row.location,
    tags: Array.isArray(row.tags) ? row.tags : [],
    attachments: normalizeAttachmentList(row.attachments),
    embed: normalizeEmbed(row.embed),
    embedPlacement: (row.embed_placement as ResourceEmbedPlacement) ?? 'above',
    bodyHtml: row.body_html ?? '',
    isPublished: row.is_published,
    coverImage: row.cover_image,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeAttachmentList(value: Json | null): ResourceAttachment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }
      const label = 'label' in entry ? String(entry.label) : '';
      const url = 'url' in entry ? String(entry.url) : '';
      if (!label || !url) {
        return null;
      }
      return { label, url };
    })
    .filter((attachment): attachment is ResourceAttachment => Boolean(attachment));
}

function normalizeEmbed(value: Json | null): ResourceEmbed | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const type = 'type' in value ? String(value.type) : null;
  if (!type) {
    return null;
  }

  switch (type) {
    case 'google-doc':
    case 'pdf': {
      const url = 'url' in value && typeof value.url === 'string' ? value.url : null;
      if (!url) {
        return null;
      }
      return { type, url };
    }
    case 'video': {
      const url = 'url' in value && typeof value.url === 'string' ? value.url : null;
      const provider =
        'provider' in value && (value.provider === 'youtube' || value.provider === 'vimeo')
          ? value.provider
          : null;
      if (!url || !provider) {
        return null;
      }
      return { type, url, provider };
    }
    case 'external': {
      const url = 'url' in value && typeof value.url === 'string' ? value.url : null;
      if (!url) {
        return null;
      }
      const label = 'label' in value && typeof value.label === 'string' ? value.label : undefined;
      return { type, url, label };
    }
    case 'html': {
      const html = 'html' in value && typeof value.html === 'string' ? value.html : null;
      if (!html) {
        return null;
      }
      return { type, html };
    }
    default:
      return null;
  }
}
