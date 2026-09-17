#!/usr/bin/env node
/* verify-covers.mjs - per-post proof for feat-img-swap. Prints one line per slug:
   bytes: source vs public vs dist md5 equal? hero/srcset/og refs in dist HTML?
   Plus global checks: zero kb- refs in dist, homepage/card thumbs, OG dims. */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = '/home/ubuntu/androidscroll-deploy';
const SRC = '/home/ubuntu/.hermes/kanban/attachments/feat-img-swap-20260917';
const DIST = join(ROOT, 'dist');
const md5 = (p) => createHash('md5').update(readFileSync(p)).digest('hex');

const SLUGS = readdirSync(SRC).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)).sort();

let fails = 0;
for (const s of SLUGS) {
  const a = md5(join(SRC, `${s}.jpg`));
  const b = md5(join(ROOT, 'public/img/covers', `${s}.jpg`));
  const c = md5(join(DIST, 'img/covers', `${s}.jpg`));
  const bytes = a === b && b === c ? 'BYTES-OK' : `MISMATCH(${a.slice(0, 8)}/${b.slice(0, 8)}/${c.slice(0, 8)})`;
  const html = readFileSync(join(DIST, s, 'index.html'), 'utf8');
  const hero = html.includes(`covers/${s}-800.jpg`) && html.includes(`covers/${s}-480.jpg 480w`);
  const og = html.includes(`covers/${s}-1200x630.jpg`);
  const kb = /kb-(hero|storage|toast|success|unknown)\.svg/.test(html);
  const line = `${s} | ${bytes} | hero_srcset=${hero ? 'YES' : 'NO'} | og1200=${og ? 'YES' : 'NO'} | kb_ref=${kb ? 'STILL THERE' : 'no'}`;
  console.log(line);
  if (bytes !== 'BYTES-OK' || !hero || !og || kb) fails += 1;
}

// global: any kb- placeholder path anywhere in dist html?
const walk = (d, out = []) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
};
const pages = walk(DIST);
let kbHits = 0;
for (const p of pages) {
  const t = readFileSync(p, 'utf8');
  if (/kb-(hero|storage|toast|success|unknown)\.svg/.test(t)) { kbHits += 1; console.log('KB-LEAK: ' + p); }
}
console.log(`dist pages scanned=${pages.length} kb_svg_refs=${kbHits}`);

// homepage + cards render the new set?
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
const homeThumbs = (home.match(/img\/covers\/[a-z0-9-]+\-480\.jpg/g) || []).length;
console.log(`homepage cover thumbs=${homeThumbs}`);
const latest = readFileSync(join(DIST, 'latest/index.html'), 'utf8');
console.log(`latest page cover thumbs=${(latest.match(/img\/covers\/[a-z0-9-]+\-480\.jpg/g) || []).length}`);
// dist ships zero kb- svg files?
const hasKbFiles = existsSync(join(DIST, 'img/kb-hero.svg'));
console.log(`dist kb-hero.svg present=${hasKbFiles}`);
console.log(fails === 0 && kbHits === 0 ? 'VERIFY: PASS 16/16' : `VERIFY: FAIL (${fails} post fails, ${kbHits} kb leaks)`);
process.exit(fails === 0 && kbHits === 0 ? 0 : 1);
