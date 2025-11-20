import { assertAllowedEmbedUrl, type Resource } from '@/lib/resources';
import { sanitizeEmbedHtml } from '@/lib/sanitize-embed';

export type ResourceAttachmentInput = {
  label: string;
  url: string;
};

const ALLOWED_ATTACHMENT_SCHEMES = new Set(['https:', 'mailto:']);

function assertAllowedAttachmentScheme(url: URL, rawInput: string): URL {
  if (!ALLOWED_ATTACHMENT_SCHEMES.has(url.protocol)) {
    throw new Error(`Attachments must use https or mailto links. Check: ${rawInput}`);
  }
  return url;
}

export function parseResourceTagsInput(input: string): string[] {
  return input
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => entry.toLowerCase())
    .slice(0, 20);
}

export function parseResourceAttachmentsInput(input: string): ResourceAttachmentInput[] {
  const lines = input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const attachments: ResourceAttachmentInput[] = [];

  for (const line of lines) {
    const [labelPart, urlPart] = line.split('|').map((segment) => segment.trim());
    const urlCandidate = urlPart ?? labelPart ?? '';
    if (!urlCandidate) {
      continue;
    }

    let normalizedUrl: string;
    try {
      const parsed = assertAllowedAttachmentScheme(new URL(urlCandidate), urlCandidate);
      normalizedUrl = parsed.toString();
    } catch {
      throw new Error(`Attachment URL must be valid. Check: ${urlCandidate}`);
    }

    const label = labelPart && urlPart ? labelPart : normalizedUrl;
    attachments.push({ label: label.slice(0, 160), url: normalizedUrl });
  }

  return attachments.slice(0, 10);
}

export function buildResourceEmbedPayload(values: {
  type: string | null;
  url?: string | null;
  provider?: string | null;
  label?: string | null;
  html?: string | null;
}): Record<string, unknown> | null {
  const type = values.type ?? 'none';
  if (!type || type === 'none') {
    return null;
  }

  switch (type) {
    case 'google-doc':
    case 'pdf': {
      const url = values.url?.trim();
      if (!url) {
        throw new Error('Provide a URL for the embed.');
      }
      assertAllowedEmbedUrl(url, 'resource_embed');
      return { type, url };
    }
    case 'video': {
      const url = values.url?.trim();
      const provider = values.provider === 'vimeo' ? 'vimeo' : 'youtube';
      if (!url) {
        throw new Error('Provide a video URL to embed.');
      }
      assertAllowedEmbedUrl(url, 'resource_video_embed');
      return { type, url, provider };
    }
    case 'external': {
      const url = values.url?.trim();
      if (!url) {
        throw new Error('Provide the external resource URL.');
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        throw new Error('Provide a valid https URL for the external resource.');
      }
      if (parsedUrl.protocol !== 'https:') {
        throw new Error('External resource URLs must use https.');
      }
      return { type, url, label: values.label?.trim() || undefined };
    }
    case 'html': {
      const html = values.html?.trim();
      if (!html) {
        throw new Error('Paste the HTML snippet you would like to embed.');
      }
      return { type, html: sanitizeEmbedHtml(html) };
    }
    default:
      return null;
  }
}

export function attachmentsToTextarea(attachments: ResourceAttachmentInput[]): string {
  if (!attachments.length) {
    return '';
  }

  return attachments.map((attachment) => `${attachment.label} | ${attachment.url}`).join('\n');
}

export function getResourceEmbedDefaults(resource: Resource): {
  type: string;
  url: string;
  provider: 'youtube' | 'vimeo';
  label: string;
  html: string;
} {
  const embed = resource.embed;
  if (!embed) {
    return {
      type: 'none',
      url: '',
      provider: 'youtube',
      label: '',
      html: '',
    };
  }

  switch (embed.type) {
    case 'google-doc':
    case 'pdf':
      return {
        type: embed.type,
        url: embed.url,
        provider: 'youtube',
        label: '',
        html: '',
      };
    case 'video':
      return {
        type: 'video',
        url: embed.url,
        provider: embed.provider,
        label: '',
        html: '',
      };
    case 'external':
      return {
        type: 'external',
        url: embed.url,
        provider: 'youtube',
        label: embed.label ?? '',
        html: '',
      };
    case 'html':
      return {
        type: 'html',
        url: '',
        provider: 'youtube',
        label: '',
        html: embed.html,
      };
    default:
      return {
        type: 'none',
        url: '',
        provider: 'youtube',
        label: '',
        html: '',
      };
  }
}
