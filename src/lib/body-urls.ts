// body-urls.ts - R2 FIRST: every non-featured post image loads from the King's
// R2 bucket https://images.androidscroll.com. Bodies already carry R2 URLs, so
// this pass is a guard: origin + legacy local /img/bodies/ refs collapse back
// to their R2 canonicals, R2 URLs pass through untouched. Bundle body files
// are NEVER edited by this pass; all rewrites happen here.
// EXCLUDED (never touched here): featured covers (src/data/covers.ts), house
// logo, OG fallback /img/og-cover.png, brand marks.
// 17 canonical R2 base files (16 bundle + 1 rescued author original).
const TO_R2: Record<string,string> = {
  "https://androidscroll.com/wp-content/uploads/2026/01/IMG_20201220_110033_443.jpg":
    "https://images.androidscroll.com/2026/01/IMG_20201220_110033_443.jpg",
  "/img/bodies/7a5199f603_IMG_20201220_110033_443.jpg":
    "https://images.androidscroll.com/2026/01/IMG_20201220_110033_443.jpg",
  "/img/bodies/ea0156439d_IMG_20220417_131836_007.jpg":
    "https://images.androidscroll.com/2022/04/IMG_20220417_131836_007.jpg",
  "/img/bodies/d7366d1625_g1-gemini-app.png":
    "https://images.androidscroll.com/2023/10/g1-gemini-app.png",
  "/img/bodies/ae57ea15b3_g2-gemini-web.png":
    "https://images.androidscroll.com/2023/10/g2-gemini-web.png",
  "/img/bodies/1ea7ab732c_g3-alarm.jpeg":
    "https://images.androidscroll.com/2023/10/g3-alarm.jpeg",
  "/img/bodies/d6fc280866_g4-phone.jpg":
    "https://images.androidscroll.com/2023/10/g4-phone.jpg",
  "/img/bodies/136e8308f2_spark40-app-rankings.webp":
    "https://images.androidscroll.com/2026/09/spark40-app-rankings.webp",
  "/img/bodies/7bb8ea814c_spark40-battery-health.webp":
    "https://images.androidscroll.com/2026/09/spark40-battery-health.webp",
  "/img/bodies/9ecb4faca3_spark40-battery-saving.webp":
    "https://images.androidscroll.com/2026/09/spark40-battery-saving.webp",
  "/img/bodies/e6dd00aede_spark40-play-protect.webp":
    "https://images.androidscroll.com/2026/09/spark40-play-protect.webp",
  "/img/bodies/7fef6d411e_spark40-storage-overview.webp":
    "https://images.androidscroll.com/2026/09/spark40-storage-overview.webp",
  "/img/bodies/780536cee7_tecno-app-storage.webp":
    "https://images.androidscroll.com/2026/09/tecno-app-storage.webp",
  "/img/bodies/839862615d_tecno-files-trash.webp":
    "https://images.androidscroll.com/2026/09/tecno-files-trash.webp",
  "/img/bodies/755d205284_tecno-find-hub.webp":
    "https://images.androidscroll.com/2026/09/tecno-find-hub.webp",
  "/img/bodies/48cc7138e9_w2-whatsapp-tecno.jpg":
    "https://images.androidscroll.com/2026/09/w2-whatsapp-tecno.jpg",
  "/img/bodies/43e58f666d_w3-whatsapp-chat-backup-tecno.jpg":
    "https://images.androidscroll.com/2026/09/w3-whatsapp-chat-backup-tecno.jpg",
  "/img/bodies/3cf1d07eb8_w4-whatsapp-privacy-tecno.jpg":
    "https://images.androidscroll.com/2026/09/w4-whatsapp-privacy-tecno.jpg",
};
export function rewriteBodyUrls(html: string): string {
  let s = html;
  for (const [from, to] of Object.entries(TO_R2)) s = s.split(from).join(to);
  // R2 URLs pass through untouched - never collapse back to local.
  // Same-host page links go relative so staging and apex resolve identically
  // (canonicals/OG stay absolute via SITE.url - untouched here).
  s = s.replace(/href="https:\/\/androidscroll\.com\//g, 'href="/');
  return s;
}
export const BODY_IMAGE_COUNT = Object.keys(TO_R2).length;
