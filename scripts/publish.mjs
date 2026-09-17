#!/usr/bin/env node
// publish.mjs - P47 WP EXIT: the WordPress-free publish workflow.
// Usage: node scripts/publish.mjs --slug=my-new-guide --title="My New Guide"
//   --desc="One-line excerpt." --cats=guides-how-tos,basics-setup [--id=12510] [--body=path/to/body.html]
// What it does:
//   1. Validates slug/title/desc/cats against the live taxonomy in content.json.
//   2. Stages an (initially empty) body file at src/bodies/<slug>.body.html -
//      paste the approved HTML there (or pass --body to copy it in).
//   3. Appends the post entry to src/data/content.json (WP id kept stable when
//      supplied; otherwise next free id above 20000, clearly non-WP).
//   4. Prints the follow-ups: npm run build, check the page, commit BOTH branches.
// Bodies are plain HTML files in git - no CMS, no database, no WP. The King
// approves what ships: this script stages, it never publishes by itself.
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'src', 'data', 'content.json');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = /^--([^=]+)=(.*)$/.exec(a);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);
const fail = (msg) => { console.error(`[publish] FATAL: ${msg}`); process.exit(1); };

const { slug, title, desc, cats } = args;
if (!slug || !title || !desc || !cats) {
  fail('need --slug= --title= --desc= --cats=a,b (comma-separated category slugs)');
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail(`bad slug "${slug}" (lowercase-dash only)`);

const data = JSON.parse(readFileSync(CONTENT, 'utf8'));
if (data.posts.some((p) => p.slug === slug)) fail(`slug "${slug}" already exists`);
const catSlugs = cats.split(',').map((s) => s.trim()).filter(Boolean);
const known = new Map(data.categories.flatMap((c) => [[c.slug, c], ...(c.children || []).map((k) => [k.slug, k])]));
for (const c of catSlugs) if (!known.has(c)) fail(`unknown category "${c}"`);
const leaf = known.get(catSlugs[catSlugs.length - 1]);
const rootSlug = catSlugs[0];

let id = Number(args.id || 0);
if (id) {
  if (!Number.isInteger(id) || id <= 0) fail(`bad --id "${args.id}"`);
  if (data.posts.some((p) => p.id === id)) fail(`id ${id} already used`);
} else {
  id = Math.max(20000, ...data.posts.map((p) => Number(p.id) || 0)) + 1;
}

const today = new Date().toISOString().slice(0, 10);
const bodyDst = join(ROOT, 'src', 'bodies', `${slug}.body.html`);
if (args.body) {
  if (!existsSync(String(args.body))) fail(`--body file not found: ${args.body}`);
  copyFileSync(String(args.body), bodyDst);
  console.log(`[publish] body copied -> src/bodies/${slug}.body.html`);
} else if (!existsSync(bodyDst)) {
  writeFileSync(bodyDst, `<p>${desc}</p>\n`);
  console.log(`[publish] stub body created at src/bodies/${slug}.body.html - REPLACE with approved HTML before shipping`);
}

const words = 0; // recomputed by hand after the real body lands: words + read_min below
const entry = {
  id, slug, url: `/${slug}/`, title, excerpt: desc,
  date: today, modified: today,
  cats: catSlugs, cat_id: leaf.id || null, cat_name: leaf.name || catSlugs[catSlugs.length - 1],
  cat_path: leaf.path || `/category/${catSlugs.join('/')}/`,
  root_name: (known.get(rootSlug) || {}).name || rootSlug, root_slug: rootSlug,
  root_id: (known.get(rootSlug) || {}).id || null,
  words, read_min: 1, comments: 0,
};
data.posts.push(entry);
writeFileSync(CONTENT, JSON.stringify(data, null, 2) + '\n');
console.log(`[publish] staged "${slug}" (id ${id}) in content.json - ${data.posts.length} posts total`);
console.log('[publish] NEXT: paste approved HTML into the body file, set words/read_min honestly,');
console.log('[publish]   then: npm run build -> check dist/<slug>/ -> commit main + pages-dist.');
