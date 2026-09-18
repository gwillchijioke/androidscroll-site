/* Featured covers - the 16 King-approved article images (King-made via Gemini
   to our brief, no third-party attribution needed). Variants live in
   public/img/covers/, built by scripts/gen-covers.mjs:
     <slug>.jpg            1424w original (reference, byte-identical to source)
     <slug>-800.jpg        800w article-hero default
     <slug>-480.jpg        480w card/thumb + small-screen srcset rung
+    <slug>-160.jpg        160w row-thumb default (spec/lat/cat rows show 56-72px)
     <slug>-1200x630.jpg   exact 1200x630 center-crop for og:image/twitter
   (scrapers demand 1200x630; source is 1424x752 so the crop loses ~nothing). */

export const COVER_ALT: Record<string, string> = {
  '6-charging-mistakes-that-damage-your-phone-battery':
    'Illustration: phone on a charger with the six battery-damaging mistakes called out',
  'android-battery-draining-fast':
    'Illustration: phone with a fast-draining battery and the usage culprits behind it',
  'android-phone-overheating':
    'Illustration: overheating phone with a warning icon beside a high thermometer',
  'android-problems-fix':
    'Illustration: Android phone with a fix checklist, every common problem solved',
  'android-storage-full-after-deleting-files':
    'Illustration: phone storage screen still full after deleting files, hidden files exposed',
  'gemini-commands-to-make-your-mornings-easier':
    'Illustration: steaming coffee beside a phone casting a sparkling wave at sunrise',
  'how-to-improve-battery-life-on-android-devices':
    'Illustration: phone with battery-saving settings stretching its charge',
  'how-to-save-your-phone-from-water-damage':
    'Illustration: phone splashed with water and the rescue steps that save it',
  'how-to-stop-malware-from-destroying-your-phone':
    'Illustration: phone shielded from malware threats',
  'how-to-test-android':
    'Illustration: phone under test with diagnostic checks running',
  'how-to-test-used-phone':
    'Illustration: checklist for testing a used phone before paying',
  'increase-storage-space-on-android':
    'Illustration: phone storage freed up with space-saving steps',
  'read-deleted-whatsapp-messages':
    'Illustration: WhatsApp chat with recovered deleted messages',
  'samsung-secret-codes-test-phone':
    'Illustration: Samsung dialler with secret test codes',
  'test-phone-battery-health':
    'Illustration: phone battery health check gauge',
  'what-damages-phone-battery':
    'Illustration: everyday habits that damage a phone battery',
};

export interface Cover {
  alt: string;
  hero: string;
  srcset: string;
  og: string;
  thumb: string;
  thumbSrcset: string;
}

const FALLBACK_ALT = 'AndroidScroll guide cover illustration';

export function coverFor(slug: string): Cover {
  const alt = COVER_ALT[slug] || FALLBACK_ALT;
  if (!COVER_ALT[slug]) {
    return {
      alt,
      hero: '/img/og-cover.png',
      srcset: '/img/og-cover.png',
      og: '/img/og-cover.png',
      thumb: '/img/og-cover.png',
      thumbSrcset: '/img/og-cover.png',
    };
  }
  return {
    alt,
    hero: `/img/covers/${slug}-800.jpg`,
    srcset: `/img/covers/${slug}-480.jpg 480w, /img/covers/${slug}-800.jpg 800w, /img/covers/${slug}.jpg 1424w`,
    og: `/img/covers/${slug}-1200x630.jpg`,
    thumb: `/img/covers/${slug}-160.jpg`,
    thumbSrcset: `/img/covers/${slug}-160.jpg 160w, /img/covers/${slug}-480.jpg 480w`,
  };
}
