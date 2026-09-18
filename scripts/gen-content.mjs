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
const THREADS = join(ROOT, 'src', 'data', 'comments.json');
const API = process.env.COMMENTS_API_BASE || 'https://androidscroll-comments.gwill.workers.dev';
const TIMEOUT_MS = 5000;
const TRIES = 3;
// P47 WP EXIT: zero WordPress in this pipeline. The content snapshot
// (src/data/content.json) is the source of truth; per-post comment counts
// bake from the Cloudflare worker (not WP). Freshness = content.json
// `generated` stamp. No wp-json fetch at build, no WP-first publish step.

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

// P47: snapshot freshness is the `generated` stamp below - the snapshot IS
// the truth now that WordPress is out of the pipeline. Nothing to compare
// against, nothing to fetch.
let fresh = 'snapshot-is-truth (WP exit v0.6.71)';

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

// T_1C669C70 schema wiring: bake full approved threads for schema.org
// Comment nodes at build time (never hardcoded in templates). Only posts
// with a live approved count > 0 are fetched. Each node keeps the PUBLIC
// fields only (id, name, created_at, text) - email_hash / reactions /
// is_author never leave the Worker. Text is tag-stripped, entity-decoded,
// whitespace-collapsed and capped at 500 chars (wiring plan rule).
function threadText(html) {
  let t = String(html || '').replace(/<[^>]*>/g, ' ');
  t = t.replace(/&#(\d+);/g, (_, n) => {
    try { return String.fromCodePoint(Number(n)); } catch { return ''; }
  });
  t = t.replace(/&(amp|lt|gt|quot|nbsp);/g, (_, e) =>
    ({ amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ' })[e] || '');
  t = t.replace(/\s+/g, ' ').trim();
  return t.length > 500 ? t.slice(0, 497) + '...' : t;
}
function fetchThread(postId) {
  const url = `${API}/api/comments?post=${postId}`;
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
          const list = Array.isArray(j && j.comments) ? j.comments : null;
          if (!list) throw new Error('bad shape');
          resolve({ ok: true, body: j });
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
let threads = {};
try {
  threads = JSON.parse(readFileSync(THREADS, 'utf8'));
  if (!threads || typeof threads !== 'object' || Array.isArray(threads)) threads = {};
} catch { threads = {}; }
const withComments = data.posts.filter((p) => (Number(p.comments) || 0) > 0);
for (const p of withComments) {
  const res = await fetchThread(p.id);
  if (res.ok) {
    const nodes = res.body.comments
      .map((c) => ({
        id: Number(c.id),
        name: String(c.name || 'Anonymous'),
        datePublished: c.created_at,
        text: threadText(c.content),
        parent: Number(c.parent) || 0,
      }))
      .filter((c) => Number.isInteger(c.id) && c.text && c.datePublished)
      .sort((a, b) => (a.datePublished < b.datePublished ? -1 : 1));
    threads[String(p.id)] = {
      count: nodes.length,
      fetched: new Date().toISOString().slice(0, 10),
      comments: nodes,
    };
  } else {
    stale = true;
    failures.push(`thread:${p.id}`);
    // keep previous threads[p.id] value (stale fallback)
  }
}
// Drop threads for posts that now sit at zero (unapproved/deleted upstream).
for (const k of Object.keys(threads)) {
  if (!withComments.some((p) => String(p.id) === k)) delete threads[k];
}
writeFileSync(THREADS, JSON.stringify(threads, null, 2) + '\n');
const threadNodes = Object.values(threads).reduce((s, t) => s + (t.comments || []).length, 0);
console.log(
  `[gen-content] posts=${data.totals.posts} cats=${data.totals.categories} ` +
  `comments=${data.totals.comments} empty_cats=${data.totals.empty_categories} ` +
  `stale=${stale}${failures.length ? ` failed=[${failures.join(',')}]` : ''} ` +
  `snapshot=${fresh} threads=${threadNodes}`,
);
process.exit(0);
