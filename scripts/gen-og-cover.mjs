#!/usr/bin/env node
/* gen-og-cover.mjs - reproducible default OG fallback card (t_7953513f).
   King rejected the AI-made card (Gemini redrew the logo), so this draws
   the 1200x630 fallback IN CODE, covers-pipeline style:
   - Logo: src/components/Wordmark.astro (the live header lockup) embedded
     VERBATIM. Only the three CSS var() refs are resolved to concrete hexes
     for the dark-green card (standalone SVG/PNG has no CSS context to read
     them from). Path data is never touched. Script aborts if the source
     shape drifts (missing/extra var() refs).
   - Ground: --canvas dark #071512 (deep green site background).
   - Tagline: SITE.tagline in Manrope (brand --sans), dash rewritten as a
     comma per the brief. No serif, no dash glyphs, no illustrations.
   - Accent: one solid teal block #00C896 (dark-theme --teal).
   Render: headless Chromium screenshot (real Manrope woff2 inlined as a
   data URI, so no fontconfig/network dependency) -> public/img/og-cover.png.
   Verifies 1200x630 via sharp. Exits non-zero on any failure. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'img', 'og-cover.png');
const SHELL = '/home/ubuntu/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell';

const fail = (msg) => { console.error(`[gen-og-cover] FATAL: ${msg}`); process.exit(1); };

/* 1. Logo: live header asset, verbatim paths. */
const wordmarkPath = join(ROOT, 'src', 'components', 'Wordmark.astro');
let logo;
try { logo = readFileSync(wordmarkPath, 'utf8'); }
catch { fail(`cannot read ${wordmarkPath}`); }
if (!/^<svg[\s>]/.test(logo.trim())) fail('Wordmark.astro does not start with <svg');
for (const v of ['var(--ink)', 'var(--deep)', 'var(--canvas)']) {
  if (!logo.includes(v)) fail(`Wordmark.astro drift: missing ${v}`);
}
if ((logo.match(/var\(/g) || []).length !== (logo.match(/var\(--(ink|deep|canvas)\)/g) || []).length)
  fail('Wordmark.astro drift: unexpected var() refs beyond ink/deep/canvas');
logo = logo
  .replaceAll('var(--ink)', '#E8F5EF')
  .replaceAll('var(--deep)', '#00A88F')
  .replaceAll('var(--canvas)', '#071512');
if (logo.includes('var(')) fail('var() refs remain after resolution');

/* 2. Tagline: site tagline, dash rewritten as comma (brief: no dashes). */
const siteSrc = readFileSync(join(ROOT, 'src', 'data', 'site.ts'), 'utf8');
const m = siteSrc.match(/tagline:\s*'([^']+)'/);
if (!m) fail('SITE.tagline not found');
const tagline = m[1].replace(' - ', ', ');
if (/[-—–]/.test(tagline)) fail(`tagline still carries a dash: ${tagline}`);

/* 3. Brand sans inlined (no system-font dependency). */
const fontPath = join(ROOT, 'public', 'fonts', 'manrope-var-latin.woff2');
let fontB64;
try { fontB64 = readFileSync(fontPath).toString('base64'); }
catch { fail(`cannot read ${fontPath}`); }

const html = `<!DOCTYPE html><html><head><meta charset="utf8"><style>
@font-face{font-family:"Manrope";font-style:normal;font-weight:200 800;font-display:swap;
src:url(data:font/woff2;base64,${fontB64}) format("woff2");}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;background:#071512}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;
font-family:"Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.logo{width:600px;display:block}
.bar{width:88px;height:10px;border-radius:5px;background:#00C896;margin-top:46px}
.tag{margin-top:30px;width:980px;text-align:center;color:#CFE4DD;
font-size:41px;line-height:1.38;font-weight:500;letter-spacing:.002em}
</style></head><body>
<div class="logo">${logo}</div>
<div class="bar"></div>
<div class="tag">${tagline}</div>
</body></html>`;

const doc = join(tmpdir(), 'og-cover-7953513f.html');
writeFileSync(doc, html);

/* 4. Render at exactly 1200x630. */
try {
  execFileSync(SHELL, [
    '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=1200,630',
    '--virtual-time-budget=5000', `--screenshot=${OUT}`, `file://${doc}`,
  ], { stdio: 'pipe', timeout: 90000 });
} catch (e) { fail(`chrome-headless-shell failed: ${String(e.message).slice(0, 300)}`); }

/* 5. Prove dimensions. */
const meta = await sharp(OUT).metadata();
if (meta.width !== 1200 || meta.height !== 630)
  fail(`bad dimensions: ${meta.width}x${meta.height}, want 1200x630`);
console.log(`[gen-og-cover] OK ${OUT} ${meta.width}x${meta.height} (${meta.format}, ${meta.size} bytes)`);
console.log(`[gen-og-cover] logo=Wordmark.astro verbatim tagline="${tagline}"`);
