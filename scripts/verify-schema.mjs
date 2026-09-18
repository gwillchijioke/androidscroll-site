// verify-schema.mjs - T_1C669C70 post-build JSON-LD inventory + assertions.
// Parses dist HTML (no browser), extracts every application/ld+json block,
// JSON-parses each, and asserts the wiring plan per URL. Exits non-zero on
// any failure. Prints a per-URL inventory table + summary counts.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const data = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'content.json'), 'utf8'));
const threads = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'comments.json'), 'utf8'));

function blocksFor(relDir) {
  const f = join(DIST, relDir, 'index.html');
  if (!existsSync(f)) return { missing: true, blocks: [] };
  const html = readFileSync(f, 'utf8');
  const re = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  const blocks = [];
  let m; let parseFail = 0;
  while ((m = re.exec(html))) {
    try { blocks.push(JSON.parse(m[1])); }
    catch { parseFail += 1; }
  }
  return { missing: false, blocks, parseFail, bytes: html.length };
}
const types = (b) => b.blocks.map((x) => x['@type'] || '?').join('+') || '(none)';
let fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const rows = [];
function row(url, relDir, note) {
  const r = blocksFor(relDir);
  rows.push({ url, types: r.missing ? 'MISSING-FILE' : types(r), n: r.blocks.length, parseFail: r.parseFail || 0, note: note || '' });
  return r;
}

// HOME
{
  const r = row('/', '', '');
  ok(r.blocks.length === 2, 'home: expected 2 blocks, got ' + r.blocks.length);
  const ws = r.blocks.find((b) => b['@type'] === 'WebSite');
  const org = r.blocks.find((b) => b['@type'] === 'Organization');
  ok(ws && ws.potentialAction && ws.potentialAction['@type'] === 'SearchAction', 'home: WebSite missing SearchAction');
  ok(ws && /\/search\/\?q=/.test(JSON.stringify(ws.potentialAction)), 'home: SearchAction target must carry /search/?q=');
  ok(org && org.logo && org.sameAs && org.sameAs.length === 9, 'home: standalone Organization needs logo + 9 sameAs');
  ok(ws && ws.publisher && ws.publisher.logo, 'home: publisher logo');
}
// POSTS
for (const p of data.posts) {
  const rel = p.url.replace(/^\//, '').replace(/\/$/, '');
  const r = row(p.url, rel, '');
  const bp = r.blocks.find((b) => b['@type'] === 'BlogPosting');
  const bc = r.blocks.find((b) => b['@type'] === 'BreadcrumbList');
  ok(bp && bc, `${p.url}: need BlogPosting+BreadcrumbList, got ${types(r)}`);
  if (bp) {
    ok(typeof bp.image === 'string' && bp.image.indexOf('/img/covers/') !== -1, `${p.url}: image must be real cover, got ${bp.image}`);
    ok(bp.publisher && bp.publisher.logo && bp.publisher.logo.url, `${p.url}: publisher.logo missing`);
    ok(!(bp.author && bp.author.sameAs), `${p.url}: author sameAs must be OMITTED (King input open)`);
    const t = threads[String(p.id)];
    if (t && t.comments.length) {
      ok(bp.commentCount === t.count, `${p.url}: commentCount ${bp.commentCount} != baked ${t.count}`);
      ok(Array.isArray(bp.comment) && bp.comment.length === t.count, `${p.url}: comment nodes ${bp.comment ? bp.comment.length : 0} != ${t.count}`);
      const bad = (bp.comment || []).filter((c) => c['@type'] !== 'Comment' || !c.author || !c.author.name || !c.text || !c.datePublished);
      ok(bad.length === 0, `${p.url}: ${bad.length} malformed Comment nodes`);
      const leak = /email_hash|reactions|is_author/.test(JSON.stringify(bp.comment));
      ok(!leak, `${p.url}: private Worker fields leaked into schema`);
    } else {
      ok(bp.commentCount === undefined && bp.comment === undefined, `${p.url}: zero-comment post must omit commentCount/comment`);
    }
    ok(!bp.aggregateRating && !bp.video, `${p.url}: forbidden nodes present`);
  }
}
// CATEGORY HUBS
for (const c of data.categories) {
  const rel = c.path.replace(/^\//, '').replace(/\/$/, '');
  const live = data.posts.filter((p) => (p.cats || []).includes(c.slug) ||
    data.categories.filter((k) => { let x = k; while (x && x.parent) { if (x.parent === c.id) return true; x = data.categories.find((z) => z.id === x.parent); } return false; }).map((k) => k.slug).includes(c.slug));
  // simpler: reuse postsIn semantics - descendants via parent chain
  const kids = new Set(data.categories.filter((k) => {
    let x = k; while (x && x.parent) { if (x.parent === c.id) return true; x = data.categories.find((z) => z.id === x.parent); }
    return false;
  }).map((k) => k.slug));
  kids.add(c.slug);
  const n = data.posts.filter((p) => (p.cats || []).some((s) => kids.has(s))).length;
  const r = row(c.path, rel, n === 0 ? 'noindex-empty' : `${n} guides`);
  if (n === 0) {
    ok(r.blocks.length === 0, `${c.path}: empty noindex hub must carry zero JSON-LD, got ${types(r)}`);
  } else {
    const cp = r.blocks.find((b) => b['@type'] === 'CollectionPage');
    const bc = r.blocks.find((b) => b['@type'] === 'BreadcrumbList');
    ok(cp && bc, `${c.path}: need CollectionPage+BreadcrumbList, got ${types(r)}`);
    if (cp) ok(cp.mainEntity && cp.mainEntity['@type'] === 'ItemList' && cp.mainEntity.numberOfItems === n, `${c.path}: ItemList count mismatch`);
  }
}
// LATEST + STATIC + SEARCH
{
  const r = row('/latest/', 'latest', '');
  ok(r.blocks.some((b) => b['@type'] === 'CollectionPage') && r.blocks.some((b) => b['@type'] === 'BreadcrumbList'), '/latest/: need CollectionPage+BreadcrumbList, got ' + types(r));
  const cp = r.blocks.find((b) => b['@type'] === 'CollectionPage');
  if (cp) ok(cp.mainEntity.numberOfItems === 16, '/latest/: ItemList must hold 16, got ' + cp.mainEntity.numberOfItems);
}
const statics = [
  ['/about/', 'about', 'AboutPage'], ['/contact/', 'contact', 'ContactPage'],
  ['/comments-policy/', 'comments-policy', 'WebPage'], ['/cookie-policy/', 'cookie-policy', 'WebPage'],
  ['/disclaimer/', 'disclaimer', 'WebPage'], ['/privacy-policy/', 'privacy-policy', 'WebPage'],
  ['/how-we-test/', 'how-we-test', 'WebPage'], ['/start-here/', 'start-here', 'WebPage'],
  ['/search/', 'search', 'WebPage'],
];
for (const [url, rel, t] of statics) {
  const r = row(url, rel, '');
  ok(r.blocks.some((b) => b['@type'] === t) && r.blocks.some((b) => b['@type'] === 'BreadcrumbList'), `${url}: need ${t}+BreadcrumbList, got ${types(r)}`);
}
// PRIVATE / NO-SCHEMA pages
for (const [url, rel] of [['/mod/', 'mod'], ['/subscribe/', 'subscribe'], ['/404.html', '404'], ['/about-androidscroll/', 'about-androidscroll']]) {
  const r = row(url, rel, 'must-stay-clean');
  ok(r.blocks.length === 0, `${url}: must carry ZERO JSON-LD, got ${types(r)}`);
}

console.log('URL | blocks | parseFail | note');
for (const r of rows) console.log(`${r.url} | ${r.types} | ${r.parseFail} | ${r.note}`);
const withLD = rows.filter((r) => r.n > 0).length;
console.log(`\nPAGES_WITH_LD=${withLD}/${rows.length} PARSE_FAILS=${rows.reduce((s, r) => s + r.parseFail, 0)}`);
if (fails.length) { console.log('\nFAILURES:'); for (const f of fails) console.log(' - ' + f); process.exit(1); }
console.log('SCHEMA_VERIFY=PASS');
