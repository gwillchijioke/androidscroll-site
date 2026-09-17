#!/usr/bin/env node
/* gen-covers.mjs - one-shot + reproducible: builds responsive featured-cover
   variants from the 16 King-approved sources into public/img/covers/.
   Sources: /home/ubuntu/.hermes/kanban/attachments/feat-img-swap-20260917/<slug>.jpg
   (1424x752 flat-vector editorial art, King-made via Gemini to our brief).
   Outputs per slug (all q82 progressive JPEG):
     <slug>.jpg            original bytes, byte-identical copy (reference)
     <slug>-800.jpg        800w article-hero default
     <slug>-480.jpg        480w small-screen srcset rung
     <slug>-1200x630.jpg   exact 1200x630 cover-crop for og:image/twitter (scrapers
                           demand 1200x630; source is 1424x752 ~1.89:1 so the
                           center crop loses almost nothing)
   Idempotent: reruns overwrite. Exits non-zero on any failure (loud, not silent). */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = '/home/ubuntu/.hermes/kanban/attachments/feat-img-swap-20260917';
const OUT_DIR = join(ROOT, 'public', 'img', 'covers');

const SLUGS = [
  '6-charging-mistakes-that-damage-your-phone-battery',
  'android-battery-draining-fast',
  'android-phone-overheating',
  'android-problems-fix',
  'android-storage-full-after-deleting-files',
  'gemini-commands-to-make-your-mornings-easier',
  'how-to-improve-battery-life-on-android-devices',
  'how-to-save-your-phone-from-water-damage',
  'how-to-stop-malware-from-destroying-your-phone',
  'how-to-test-android',
  'how-to-test-used-phone',
  'increase-storage-space-on-android',
  'read-deleted-whatsapp-messages',
  'samsung-secret-codes-test-phone',
  'test-phone-battery-health',
  'what-damages-phone-battery',
];

mkdirSync(OUT_DIR, { recursive: true });

let done = 0;
for (const slug of SLUGS) {
  const src = join(SRC_DIR, `${slug}.jpg`);
  if (!existsSync(src)) {
    console.error(`[gen-covers] FATAL missing source: ${src}`);
    process.exit(1);
  }
  copyFileSync(src, join(OUT_DIR, `${slug}.jpg`));
  await sharp(src).resize({ width: 800 }).jpeg({ quality: 82, progressive: true })
    .toFile(join(OUT_DIR, `${slug}-800.jpg`));
  await sharp(src).resize({ width: 480 }).jpeg({ quality: 82, progressive: true })
    .toFile(join(OUT_DIR, `${slug}-480.jpg`));
  await sharp(src).resize({ width: 1200, height: 630, fit: 'cover', position: 'center' })
    .jpeg({ quality: 82, progressive: true })
    .toFile(join(OUT_DIR, `${slug}-1200x630.jpg`));
  done += 1;
  console.log(`[gen-covers] ${slug}: 4 variants`);
}
console.log(`[gen-covers] OK ${done}/16 slugs x 4 variants = ${done * 4} files`);
