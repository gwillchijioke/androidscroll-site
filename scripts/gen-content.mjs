// gen-content.mjs - P8 AUTO-COUNTS prebuild step (npm `prebuild` hook).
// Regenerates src/data/content.json counts at build time so no number is
// hard-coded: per-post + total comments come from the Worker PUBLIC API,
// post/category/empty-category math is derived from the posts array.
// Node 18+, zero dependencies.
//
// Behavior:
// - Loads src/data/content.json as the base snapshot (words/read_min and all
//   editorial fields are carried over - there is no src/content/ body source
//   to recompute them from).
// - Per post (sequential, cheap for ~13 posts):
//     GET {API}/api/comments/count?post={wpId}  (5s timeout x 3 tries)
// - Sets posts[].comments, totals.comments = sum(per-post).
// - Derives totals.posts / totals.categories / totals.empty_categories
//   (direct-post semantics, matching WP count) and refreshes every
//   category.count + embedded children[].count the same way.
// - Stamps generated (build ISO date) + honest source line.
// - NEVER breaks the build: any fetch failure keeps the previous value and
//   stamps stale:true; exits 0 always (a non-zero exit would block deploy).
//
// Env override: COMMENTS_API_BASE (default = Worker URL in Comments.astro).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'src', 'data', 'content.json');
const API = process.env.COMMENTS_API_BASE || 'https://androidscroll-comments.gwill.workers.dev';
const TIMEOUT_MS = 5000;
const TRIES = 3;
// DATA-1 snapshot freshness: WP truth for the newest-post check. Read-only,
// one tiny request; any failure only silences the freshness line, never build.
const WP_API = process.env.WP_API_BASE || 'https://androidscroll.com/wp-json/wp/v2';

function fetchCount(postId) {
  const url = `${API}/api/comments/count?post=${postId}`;
  return new Promise((resolve) => {
    let attempt = 0;
    const tryOnce = () => {
      attempt += 1;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      fetch(url, { signal: ctrl.signal })
        .then((r) => {
          if (!r.ok) throw new Error(`http ${r.status}`);
          return r.json();
        })
        .then((j) => {
          clearTimeout(timer);
          const n = Number(j && j.count);
          if (!Number.isInteger(n) || n < 0) throw new Error('bad shape');
          resolve({ ok: true, count: n });
        })
        .catch((err) => {
          clearTimeout(timer);
          if (attempt < TRIES) tryOnce();
          else resolve({ ok: false, error: String(err && err.message || err) });
        });
    };
    tryOnce();
  });
}

const data = JSON.parse(readFileSync(CONTENT, 'utf8'));

// ARCH-1 shape assert: a renamed/missing snapshot field must fail LOUD here,
// not deep in a page template. Runs before any mutation below.
const shapeBad = [];
if (!Array.isArray(data.posts)) shapeBad.push('posts[]');
if (!Array.isArray(data.categories)) shapeBad.push('categories[]');
for (const p of (data.posts || [])) {
  for (const k of ['id', 'slug', 'title', 'url', 'cat_path']) {
    if (p[k] === undefined || p[k] === null || p[k] === '') { shapeBad.push(`post#${p.id || '?'}:${k}`); break; }
  }
}
for (const c of (data.categories || [])) {
  for (const k of ['slug', 'path']) {
    if (c[k] === undefined || c[k] === null || c[k] === '') { shapeBad.push(`cat:${c.slug || '?'}:${k}`); break; }
  }
}
if (shapeBad.length) {
  console.error('[gen-content] FATAL snapshot shape (ARCH-1): ' + shapeBad.slice(0, 8).join(', '));
  process.exit(1);
}

// AUDIT-01 L4a: pipeline compromise must break the build, not ship.
// Every post url stays site-relative; a javascript: (or absolute) url aborts.
const badUrls = data.posts.filter((pl) => typeof pl.url !== "string" || pl.url.indexOf("/") !== 0 || pl.url.indexOf("javascript:") !== -1).map((pl) => String(pl.id) + ":" + String(pl.url));
if (badUrls.length) {
  console.error('[gen-content] FATAL post urls must be site-relative (L4a): ' + badUrls.join(', '));
  process.exit(1);
}
let stale = false;
const failures = [];

// Sequential: kind to the Worker, trivial cost at 13 posts. Past ~30 posts
// the loop fans out in small batches so prebuild does not stretch (DATA-1).
const MANY = data.posts.length > 30;
async function bakeCounts(p) {
  const res = await fetchCount(p.id);
  if (res.ok) {
    p.comments = res.count;
  } else {
    stale = true;
    failures.push(p.id);
    // keep previous p.comments value (stale fallback)
  }
}
if (MANY) {
  for (let i = 0; i < data.posts.length; i += 5) {
    await Promise.all(data.posts.slice(i, i + 5).map(bakeCounts));
  }
} else {
  for (const p of data.posts) await bakeCounts(p);
}

// DATA-1 snapshot freshness check: compare WP newest against the snapshot's
// newest modified. Visibility ONLY - never fails, never auto-publishes; the
// King approves what ships. One read, 8s leash.
let fresh = 'unknown';
try {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const r = await fetch(`${WP_API}/posts?per_page=1&_fields=date,modified,slug`, { signal: ctrl.signal });
  clearTimeout(timer);
  if (r.ok) {
    const [wp] = await r.json();
    const snapNewest = data.posts.map((p) => String(p.modified || p.date || '')).sort().pop() || '';
    const wpDay = String((wp && wp.modified) || (wp && wp.date) || '').slice(0, 10);
    if (!wpDay) fresh = 'wp-unreadable';
    else if (snapNewest.slice(0, 10) >= wpDay) fresh = `current (wp newest ${wp.slug} ${wpDay})`;
    else fresh = `BEHIND: wp newest "${wp.slug}" ${wpDay} > snapshot ${snapNewest.slice(0, 10)} - refresh the snapshot`;
  } else fresh = `wp-http-${r.status}`;
} catch (err) {
  fresh = String(err && err.message || err).slice(0, 60);
}

const directCount = (slug) => data.posts.filter((p) => (p.cats || []).includes(slug)).length;

for (const c of data.categories) {
  c.count = directCount(c.slug);
  if (Array.isArray(c.children)) {
    for (const k of c.children) k.count = directCount(k.slug);
  }
}

data.totals = {
  posts: data.posts.length,
  categories: data.categories.length,
  comments: data.posts.reduce((s, p) => s + (Number(p.comments) || 0), 0),
  empty_categories: data.categories.filter((c) => directCount(c.slug) === 0).length,
};
data.generated = new Date().toISOString().slice(0, 10);
data.source = `computed at build from snapshot + comments API (${API}, public per-post counts)`;
data.stale = stale;

writeFileSync(CONTENT, JSON.stringify(data, null, 2) + '\n');
console.log(
  `[gen-content] posts=${data.totals.posts} cats=${data.totals.categories} ` +
  `comments=${data.totals.comments} empty_cats=${data.totals.empty_categories} ` +
  `stale=${stale}${failures.length ? ` failed=[${failures.join(',')}]` : ''} ` +
  `snapshot=${fresh}`,
);
process.exit(0);
