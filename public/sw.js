/**
 * AndroidScroll service worker (P17a — static port of the finance sw.js).
 *
 * Conservative caching, per the P17 dossier §3: navigations are network-first
 * with a cached copy (then the offline shell) as fallback; content-hashed
 * /_astro/ chunks are immutable and served cache-first; everything else static
 * uses stale-while-revalidate. /api and Worker calls are NEVER intercepted.
 * 0.6.37-a4c7058 is stamped at prebuild (scripts/stamp-pwa.mjs) so every deploy
 * ships fresh cache namespaces and activate purges the old ones.
 */

/* eslint-disable no-restricted-globals */
const VERSION = `andscroll-0.6.37-a4c7058`;
const SHELL = new URL('./', self.location).href; // site root in ANY base (apex or /androidscroll-site/)
const ASSET_CACHE = `as-assets-${VERSION}`;
const PAGE_CACHE = `as-pages-${VERSION}`;

// Never intercept these (finance /wp-admin|/wp-json exclusions, static translation:
// the comments Worker + any same-origin /api surface — push/submits stay live).
const EXCLUDE = [
  /\/api\//,
  /workers\.dev\//,
  /manifest\.webmanifest/,
  /[?&](preview|nocache|action|noamp)=/,
];

const isStatic = p =>
  /\/_astro\//.test(p) || /\.(?:css|m?js|woff2?|ttf|png|jpe?g|webp|gif|svg|ico|webmanifest)$/i.test(p);
const isImmutable = p => /\/_astro\//.test(p); // content-hashed names: never revalidate

// ── 1. install: precache the offline shell, take over early ────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(ASSET_CACHE)
      .then(cache => cache.add(new Request(SHELL, { cache: 'reload' })))
      .catch(() => {}) // a shell miss must not fail the install
      .then(() => self.skipWaiting())
  );
});

// ── 2. activate: purge stale cache namespaces (version-busted above) ───────
// AUDIT-02 B2 (v0.6.36): caches.delete() is ORIGIN-wide, and GH Pages serves a
// whole user site (godschi10.github.io) from one origin — other apps/projects
// there may own their own caches. Purge ONLY caches carrying OUR prefixes;
// never touch anything else. Fetch-handler behavior untouched.
self.addEventListener('activate', event => {
  const isOurs = k => k.startsWith('as-assets-') || k.startsWith('as-pages-');
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => isOurs(k) && k !== ASSET_CACHE && k !== PAGE_CACHE)
            .map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── 3. fetch: the three strategies, nothing else touched ────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return; // Worker/API cross-origin: never touched
  if (EXCLUDE.some(re => re.test(url.pathname + url.search))) return;

  // Navigations: network-first, cached page when offline, shell as last door.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then(cache => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then(hit => hit || caches.match(SHELL).then(shell => shell || Response.error()))
        )
    );
    return;
  }

  // Immutable /_astro/ chunks: cache-first (stamped deploys rename them anyway).
  if (isImmutable(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        hit =>
          hit ||
          fetch(req).then(res => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(ASSET_CACHE).then(cache => cache.put(req, copy)).catch(() => {});
            }
            return res;
          })
      )
    );
    return;
  }

  // Other static assets: stale-while-revalidate.
  if (isStatic(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(cache =>
        cache.match(req).then(cached => {
          const network = fetch(req, { cache: 'no-cache' })
            .then(res => {
              if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
              return res;
            })
            .catch(() => undefined);
          return cached || network || Response.error();
        })
      )
    );
    return;
  }
  // Everything else: default network (never cached).
});

// ── 4. push (dormant until P17b ships the send path) ────────────────────────
self.addEventListener('push', event => {
  let data = null;
  try {
    data = event.data ? event.data.json() : null;
  } catch {
    /* non-JSON payload */
  }
  if (!data || !data.title) return;
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || '',
      icon: data.icon || 'icons/icon-192.png',
      badge: data.badge || 'icons/icon-192.png',
      data: { url: data.url || self.location.href },
      tag: 'andscroll-' + String(data.url || '').replace(/[^a-z0-9_-]/gi, '-'),
      vibrate: [120, 80, 120],
    })
  );
});

// ── 5. notificationclick: focus-or-open the post ────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || self.location.href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if ('focus' in c) return c.focus().then(() => 'navigate' in c && c.navigate(target));
      }
      return self.clients.openWindow(target);
    })
  );
});
