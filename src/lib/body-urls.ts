// body-urls.ts - P47 WP EXIT: build-time origin->local image map.
// Bundle bundle files are NEVER edited; all rewrites happen here.
// 17 base files (16 bundle + 1 rescued author original for /subscribe/) + sized srcset variants collapse to base.
const LOCAL: Record<string,string> = {
  "https://androidscroll.com/wp-content/uploads/2026/01/IMG_20201220_110033_443.jpg": "/img/bodies/7a5199f603_IMG_20201220_110033_443.jpg",
  "https://images.androidscroll.com/2022/04/IMG_20220417_131836_007.jpg": "/img/bodies/ea0156439d_IMG_20220417_131836_007.jpg",
  "https://images.androidscroll.com/2023/10/g1-gemini-app-300x126.png": "/img/bodies/d7366d1625_g1-gemini-app.png",
  "https://images.androidscroll.com/2023/10/g1-gemini-app.png": "/img/bodies/d7366d1625_g1-gemini-app.png",
  "https://images.androidscroll.com/2023/10/g2-gemini-web-1024x576.png": "/img/bodies/ae57ea15b3_g2-gemini-web.png",
  "https://images.androidscroll.com/2023/10/g2-gemini-web-1536x864.png": "/img/bodies/ae57ea15b3_g2-gemini-web.png",
  "https://images.androidscroll.com/2023/10/g2-gemini-web-300x169.png": "/img/bodies/ae57ea15b3_g2-gemini-web.png",
  "https://images.androidscroll.com/2023/10/g2-gemini-web-768x432.png": "/img/bodies/ae57ea15b3_g2-gemini-web.png",
  "https://images.androidscroll.com/2023/10/g2-gemini-web.png": "/img/bodies/ae57ea15b3_g2-gemini-web.png",
  "https://images.androidscroll.com/2023/10/g3-alarm-1024x1536.jpeg": "/img/bodies/1ea7ab732c_g3-alarm.jpeg",
  "https://images.androidscroll.com/2023/10/g3-alarm-200x300.jpeg": "/img/bodies/1ea7ab732c_g3-alarm.jpeg",
  "https://images.androidscroll.com/2023/10/g3-alarm-683x1024.jpeg": "/img/bodies/1ea7ab732c_g3-alarm.jpeg",
  "https://images.androidscroll.com/2023/10/g3-alarm-768x1152.jpeg": "/img/bodies/1ea7ab732c_g3-alarm.jpeg",
  "https://images.androidscroll.com/2023/10/g3-alarm.jpeg": "/img/bodies/1ea7ab732c_g3-alarm.jpeg",
  "https://images.androidscroll.com/2023/10/g4-phone-1024x683.jpg": "/img/bodies/d6fc280866_g4-phone.jpg",
  "https://images.androidscroll.com/2023/10/g4-phone-300x200.jpg": "/img/bodies/d6fc280866_g4-phone.jpg",
  "https://images.androidscroll.com/2023/10/g4-phone-768x512.jpg": "/img/bodies/d6fc280866_g4-phone.jpg",
  "https://images.androidscroll.com/2023/10/g4-phone.jpg": "/img/bodies/d6fc280866_g4-phone.jpg",
  "https://images.androidscroll.com/2026/01/IMG_20201220_110033_443.jpg": "/img/bodies/7a5199f603_IMG_20201220_110033_443.jpg",
  "https://images.androidscroll.com/2026/09/spark40-app-rankings-135x300.webp": "/img/bodies/136e8308f2_spark40-app-rankings.webp",
  "https://images.androidscroll.com/2026/09/spark40-app-rankings-461x1024.webp": "/img/bodies/136e8308f2_spark40-app-rankings.webp",
  "https://images.androidscroll.com/2026/09/spark40-app-rankings-691x1536.webp": "/img/bodies/136e8308f2_spark40-app-rankings.webp",
  "https://images.androidscroll.com/2026/09/spark40-app-rankings.webp": "/img/bodies/136e8308f2_spark40-app-rankings.webp",
  "https://images.androidscroll.com/2026/09/spark40-battery-health-135x300.webp": "/img/bodies/7bb8ea814c_spark40-battery-health.webp",
  "https://images.androidscroll.com/2026/09/spark40-battery-health-461x1024.webp": "/img/bodies/7bb8ea814c_spark40-battery-health.webp",
  "https://images.androidscroll.com/2026/09/spark40-battery-health-691x1536.webp": "/img/bodies/7bb8ea814c_spark40-battery-health.webp",
  "https://images.androidscroll.com/2026/09/spark40-battery-health.webp": "/img/bodies/7bb8ea814c_spark40-battery-health.webp",
  "https://images.androidscroll.com/2026/09/spark40-battery-saving-135x300.webp": "/img/bodies/9ecb4faca3_spark40-battery-saving.webp",
  "https://images.androidscroll.com/2026/09/spark40-battery-saving-461x1024.webp": "/img/bodies/9ecb4faca3_spark40-battery-saving.webp",
  "https://images.androidscroll.com/2026/09/spark40-battery-saving-691x1536.webp": "/img/bodies/9ecb4faca3_spark40-battery-saving.webp",
  "https://images.androidscroll.com/2026/09/spark40-battery-saving.webp": "/img/bodies/9ecb4faca3_spark40-battery-saving.webp",
  "https://images.androidscroll.com/2026/09/spark40-play-protect-135x300.webp": "/img/bodies/e6dd00aede_spark40-play-protect.webp",
  "https://images.androidscroll.com/2026/09/spark40-play-protect-461x1024.webp": "/img/bodies/e6dd00aede_spark40-play-protect.webp",
  "https://images.androidscroll.com/2026/09/spark40-play-protect-691x1536.webp": "/img/bodies/e6dd00aede_spark40-play-protect.webp",
  "https://images.androidscroll.com/2026/09/spark40-play-protect.webp": "/img/bodies/e6dd00aede_spark40-play-protect.webp",
  "https://images.androidscroll.com/2026/09/spark40-storage-overview-135x300.webp": "/img/bodies/7fef6d411e_spark40-storage-overview.webp",
  "https://images.androidscroll.com/2026/09/spark40-storage-overview-461x1024.webp": "/img/bodies/7fef6d411e_spark40-storage-overview.webp",
  "https://images.androidscroll.com/2026/09/spark40-storage-overview-691x1536.webp": "/img/bodies/7fef6d411e_spark40-storage-overview.webp",
  "https://images.androidscroll.com/2026/09/spark40-storage-overview.webp": "/img/bodies/7fef6d411e_spark40-storage-overview.webp",
  "https://images.androidscroll.com/2026/09/tecno-app-storage-135x300.webp": "/img/bodies/780536cee7_tecno-app-storage.webp",
  "https://images.androidscroll.com/2026/09/tecno-app-storage-461x1024.webp": "/img/bodies/780536cee7_tecno-app-storage.webp",
  "https://images.androidscroll.com/2026/09/tecno-app-storage-691x1536.webp": "/img/bodies/780536cee7_tecno-app-storage.webp",
  "https://images.androidscroll.com/2026/09/tecno-app-storage.webp": "/img/bodies/780536cee7_tecno-app-storage.webp",
  "https://images.androidscroll.com/2026/09/tecno-files-trash-135x300.webp": "/img/bodies/839862615d_tecno-files-trash.webp",
  "https://images.androidscroll.com/2026/09/tecno-files-trash-461x1024.webp": "/img/bodies/839862615d_tecno-files-trash.webp",
  "https://images.androidscroll.com/2026/09/tecno-files-trash-691x1536.webp": "/img/bodies/839862615d_tecno-files-trash.webp",
  "https://images.androidscroll.com/2026/09/tecno-files-trash.webp": "/img/bodies/839862615d_tecno-files-trash.webp",
  "https://images.androidscroll.com/2026/09/tecno-find-hub-135x300.webp": "/img/bodies/755d205284_tecno-find-hub.webp",
  "https://images.androidscroll.com/2026/09/tecno-find-hub-461x1024.webp": "/img/bodies/755d205284_tecno-find-hub.webp",
  "https://images.androidscroll.com/2026/09/tecno-find-hub-691x1536.webp": "/img/bodies/755d205284_tecno-find-hub.webp",
  "https://images.androidscroll.com/2026/09/tecno-find-hub.webp": "/img/bodies/755d205284_tecno-find-hub.webp",
  "https://images.androidscroll.com/2026/09/w2-whatsapp-tecno-135x300.jpg": "/img/bodies/48cc7138e9_w2-whatsapp-tecno.jpg",
  "https://images.androidscroll.com/2026/09/w2-whatsapp-tecno-461x1024.jpg": "/img/bodies/48cc7138e9_w2-whatsapp-tecno.jpg",
  "https://images.androidscroll.com/2026/09/w2-whatsapp-tecno-691x1536.jpg": "/img/bodies/48cc7138e9_w2-whatsapp-tecno.jpg",
  "https://images.androidscroll.com/2026/09/w2-whatsapp-tecno.jpg": "/img/bodies/48cc7138e9_w2-whatsapp-tecno.jpg",
  "https://images.androidscroll.com/2026/09/w3-whatsapp-chat-backup-tecno-135x300.jpg": "/img/bodies/43e58f666d_w3-whatsapp-chat-backup-tecno.jpg",
  "https://images.androidscroll.com/2026/09/w3-whatsapp-chat-backup-tecno-461x1024.jpg": "/img/bodies/43e58f666d_w3-whatsapp-chat-backup-tecno.jpg",
  "https://images.androidscroll.com/2026/09/w3-whatsapp-chat-backup-tecno.jpg": "/img/bodies/43e58f666d_w3-whatsapp-chat-backup-tecno.jpg",
  "https://images.androidscroll.com/2026/09/w4-whatsapp-privacy-tecno-135x300.jpg": "/img/bodies/3cf1d07eb8_w4-whatsapp-privacy-tecno.jpg",
  "https://images.androidscroll.com/2026/09/w4-whatsapp-privacy-tecno-461x1024.jpg": "/img/bodies/3cf1d07eb8_w4-whatsapp-privacy-tecno.jpg",
  "https://images.androidscroll.com/2026/09/w4-whatsapp-privacy-tecno.jpg": "/img/bodies/3cf1d07eb8_w4-whatsapp-privacy-tecno.jpg",
};
// Fallback: any images-host URL whose file stem (minus WP -WxH size suffix)
// matches a known local file's stem collapses to that file. Covers srcset
// variants in current + future bodies without touching the map above.
const STEMS: Record<string, string> = {};
for (const local of Object.values(LOCAL)) {
  const base = local.split('/').pop() || '';
  STEMS[base.replace(/^[0-9a-f]{10}_/, '').toLowerCase()] = local;
}
export function rewriteBodyUrls(html: string): string {
  let s = html;
  for (const [from, to] of Object.entries(LOCAL)) s = s.split(from).join(to);
  s = s.replace(/https:\/\/images\.androidscroll\.com\/[^\s"'()]+/g, (u) => {
    const file = (u.split('/').pop() || '').toLowerCase();
    const stem = file.replace(/-\d+x\d+(\.[a-z]+)$/, '$1');
    return STEMS[stem] || u;
  });
  // Same-host page links go relative so staging and apex resolve identically
  // (canonicals/OG stay absolute via SITE.url - untouched here).
  s = s.replace(/href="https:\/\/androidscroll\.com\//g, 'href="/');
  return s;
}
export const BODY_IMAGE_COUNT = Object.keys(LOCAL).length;
