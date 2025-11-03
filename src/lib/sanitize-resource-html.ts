import sanitizeHtml, { type IOptions } from 'sanitize-html';
import { ALLOWED_EMBED_HOSTS } from '@/lib/resources';

const allowedTags = Array.from(
  new Set([
    ...sanitizeHtml.defaults.allowedTags,
    'iframe',
    'h1',
    'h2',
    'h3',
    'h4',
    'figure',
    'figcaption',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'pre',
    'code',
    'img',
  ]),
);

const allowedAttributes: IOptions['allowedAttributes'] = {
  ...sanitizeHtml.defaults.allowedAttributes,
  iframe: ['src', 'title', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy'],
  a: ['href', 'title', 'rel', 'target'],
  img: ['src', 'alt', 'title', 'loading', 'width', 'height'],
};

const allowedSchemes = ['http', 'https', 'mailto'];

export function sanitizeResourceHtml(input: string) {
  return sanitizeHtml(input, {
    allowedTags,
    allowedAttributes,
    allowedSchemes,
    allowedSchemesByTag: {
      iframe: ['http', 'https'],
      img: ['http', 'https'],
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
      img: (tagName, attribs) => {
        const src = attribs.src;
        if (!src) {
          return { tagName: 'div', attribs: {}, text: '' };
        }
        return {
          tagName,
          attribs: {
            ...attribs,
            loading: attribs.loading ?? 'lazy',
          },
        };
      },
    },
  });
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (error) {
    return '';
  }
}
