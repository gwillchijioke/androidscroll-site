# AndroidScroll — Site Bible (v0.6.69, Sep 16 2026)

Clickable build: **Header, Homepage (v3 front page), Article (C-FULL), Footer** at flagship quality with real
content (13 posts / 19 shelves / 52 comments — honest counts).
Direction A2 "editorial green" (approved), self-hosted fonts, zero external requests on public routes.

## Ship (staging — GitHub Pages, live now)

- Staging: `https://godschi10.github.io/androidscroll-site/` (branch `pages-dist` = served; `main` = source)
- Desk: `/mod/` · `desk v0.6.69`
- Build: `npm ci && node scripts/copy-fonts.mjs && NODE_OPTIONS=--max-old-space-size=384 npm run build`
- `dist/` is page-relative (`relativize.mjs`) — unzip anywhere and open `index.html` from `file://` on a phone; links, Browse sheet, search, theme and ad-toggle all work.

## Apex cutover (MEDIA CREW — production is yours)

1. Read `MEDIA-CREW-CUTOVER-CARD.md` (edge-worker fixes) and `MEDIA-CREW-HANDOVER.md` (this pack) first.
2. Canonical is already apex (`https://androidscroll.com`, `trailingSlash: 'always'`).
3. On cutover flip: robots.txt + sitemap `<loc>` lines to apex (notes in-file), push-worker `SITE_FEED_URL` → apex rss, cache rules (HTML 300s; fonts/_astro/icons immutable year), security headers.
4. Secrets live in Cloudflare (workers) — never in this repo. Desk key reads; commander key sounds.

## Content & data

- `src/data/content.json` — generated from WP REST (source of truth for counts/dates); regenerate via `scripts/gen-content.mjs`.
- Env (all optional, defaults are the live rails): `COMMENTS_API_BASE`, `WP_API_BASE` (default apex wp-json), `PUBLIC_COMMENTS_API` / `PUBLIC_PUSH_API` (baked rails in `src/data/endpoints.ts` — moving hosts = set these, no code edits).
- 13 articles (C-FULL: quick-answer, dual TOC + spy, prose, lightbox, share, author, related, prev/next, progress, BlogPosting + BreadcrumbList JSON-LD), 19 category shelves (thin ones self-noindex until 3+ guides), homepage carries WebSite + Organization entity, brand OG card `/img/og-cover.png` on every shareable route.
- `style-test-article` = unlisted lab fixture (noindex). `/mod/` desk = noindex. `/latest/` = redirect stub.

## Design system (A2 editorial green)

- Tokens in `src/styles/global.css`: paper `#FFFFFF`, verdict `#0A332C`, deep `#006E5E`, teal `#00A88F`, mint `#D9F2E8`, band `#EDF6F3`.
- Type: Archivo (display) · Manrope (body/UI) · monospace (meta/kickers/bylines/counts) — OFL, self-hosted latin subsets in `src/assets/fonts`, copied to `public/fonts` by `scripts/copy-fonts.mjs`. Body 16px minimum (no iOS zoom), 44px targets.
- Laws honored: green-only · H1 "Master your Android." · no hamburger (Browse sheet) · ad-toggle OFF = zero height/zero request/zero shift · honest counts · empty categories noindex · EEAT trust band · canonical slugs preserved · Astro + static, zero framework runtime on public routes.

## Audit record (Sep 16 2026 — all closed)

Responsive/mobile, accessibility (WCAG 2.2 AA), cross-browser, speed, SEO, cleanup, design-consistency, static-vs-dynamic — reports in `/tmp/audit/`. Standing accepted-degradations: `:has()` duplication on Safari <15.4, single 75KB global CSS, brand OG card shared by all articles until per-article rasters exist.

© 2026 AndroidScroll — client asset, zero GWill DNA.
