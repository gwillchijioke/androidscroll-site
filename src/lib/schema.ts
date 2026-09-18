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

/** Publisher logo node - one stable asset everywhere (matches the homepage
    WebSite.publisher.logo that the audit already passed as OK). A dedicated
    square logo file is a Lead/King follow-up, not this task. */
export function publisherLogo() {
  return { '@type': 'ImageObject', url: SITE.url + '/img/og-cover.png' };
}
