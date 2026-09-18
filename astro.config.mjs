import { defineConfig } from 'astro/config';

// AndroidScroll prototype — Astro static, no integrations, no UI kits.
export default defineConfig({
  output: 'static',
  site: 'https://androidscroll.com/',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    /* t_e8e06311 PSI (3): LCP render delay 2410ms with TTFB 0ms = the parser
       sat waiting on the render-blocking external stylesheet. Inlining the
       ~15 KiB base CSS removes that round trip on every cold load (edge TTFB
       is ~0, so the CSS fetch dominated); repeat-view caching loss is
       negligible against a 2.4s LCP delay. */
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
});
