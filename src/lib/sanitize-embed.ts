import sanitizeHtml, { type IOptions } from 'sanitize-html';
import { ALLOWED_EMBED_HOSTS } from './resources';

const allowedTags = Array.from(new Set([...sanitizeHtml.defaults.allowedTags, 'iframe']));

const allowedAttributes: IOptions['allowedAttributes'] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  iframe: ['src', 'title', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy'],
  a: ['href', 'title', 'rel', 'target'],
};

const allowedSchemes = ['http', 'https', 'mailto'];

export function sanitizeEmbedHtml(input: string) {
  return sanitizeHtml(input, {
    allowedTags,
    allowedAttributes,
    allowedSchemes,
    allowedSchemesByTag: {
      iframe: ['http', 'https'],
    },
    transformTags: {
      iframe: (tagName, attribs) => {
        const src = attribs.src;
        if (!src || !ALLOWED_EMBED_HOSTS.has(getHostname(src))) {
          return { tagName: 'div', attribs: {}, text: '' };
        }
        return {
          tagName,
          attribs: {
            ...attribs,
            loading: attribs.loading ?? 'lazy',
            referrerpolicy: attribs.referrerpolicy ?? 'no-referrer-when-downgrade',
          },
        };
      },
      a: (tagName, attribs) => {
        const href = attribs.href;
        if (!href) {
          return { tagName, attribs: { ...attribs } };
        }
        return {
          tagName,
          attribs: {
            ...attribs,
            rel: attribs.rel ?? 'noopener noreferrer',
            target: attribs.target ?? '_blank',
          },
        };
      },
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === 'iframe') {
        const src = frame.attribs?.src;
        if (!src || !ALLOWED_EMBED_HOSTS.has(getHostname(src))) {
          return true;
        }
      }
      return false;
    },
  });
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}
