/* schema.ts - T_1C669C70 shared JSON-LD builders (single dialect for every
   static/collection template). Only semantically applicable types: no
   aggregateRating (no visible ratings), no VideoObject (no embeds), no
   DiscussionForumPosting, no HowTo-by-default, no FAQPage-by-default.
   Author Person sameAs is deliberately omitted everywhere until the King
   confirms handles - never copy brand-account URLs onto the Person. */
import { SITE } from '../data/site';

export interface Crumb {
  name: string;
  href?: string;
}

/** BreadcrumbList mirroring the rendered Home › … trail verbatim. */
export function breadcrumbLD(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) =>
      c.href
        ? { '@type': 'ListItem', position: i + 1, name: c.name, item: SITE.url + c.href }
        : { '@type': 'ListItem', position: i + 1, name: c.name },
    ),
  };
}

/** Plain typed page node (AboutPage / ContactPage / WebPage). */
export function pageLD(type: 'AboutPage' | 'ContactPage' | 'WebPage', name: string, path: string, desc: string) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description: desc,
    url: SITE.url + path,
    isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url + '/' },
  };
}

/* T_BA38A71D (King's max-out): canonical identity lists. Organization
   sameAs = exactly the 3 brand handles the King named (youtube CLEANED:
   socials.ts keeps the research-leg trailing dot for the icon href, schema
   never carries it). Author Person sameAs = the King's personal X only -
   never brand accounts on the Person, never the dev GitHub. */
export const ORG_SAMEAS: string[] = [
  'https://x.com/androidscroll',
  'https://youtube.com/@androidscroll',
  'https://instagram.com/androidscroll_',
];
export const AUTHOR_SAMEAS: string[] = ['https://x.com/GwillChijioke'];
export const AUTHOR_ID_SUFFIX = '/about/#author';

/** Full author Person node (posts reference it by @id URL). */
export function authorLD() {
  return {
    '@type': 'Person',
    name: 'G-will Chijioke',
    url: SITE.url + AUTHOR_ID_SUFFIX,
    sameAs: AUTHOR_SAMEAS,
  };
}

/** Inline publisher node for BlogPosting (logo + 3-handle identity). */
export function publisherLD() {
  return {
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url + '/',
    logo: { '@type': 'ImageObject', url: SITE.url + '/img/og-cover.png' },
    sameAs: ORG_SAMEAS,
  };
}

/** Speakable spec for articles. Selectors mirror the rendered DOM verbatim:
    h1.art-h1 (headline) + p.qa-verdict (quick answer) + #keep-reading (body). */
export function speakableLD() {
  return {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.art-h1', '.qa-verdict', '#keep-reading'],
  };
}
