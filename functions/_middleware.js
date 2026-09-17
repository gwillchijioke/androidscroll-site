/* Mod-desk subdomain router (t_a8cadcaf) - Cloudflare Pages Function.
 *
 * The King ordered the mod desk off the /mod/ path onto its own subdomain
 * mod.androidscroll.com. The desk itself (src/pages/mod.astro -> dist/mod/)
 * is byte-identical and untouched; this file only routes by hostname:
 *
 *   mod.androidscroll.com /             -> serves dist/mod/ bytes (rewrite,
 *                                          browser URL stays clean root)
 *   mod.androidscroll.com /mod...       -> 301 to https://mod.androidscroll.com/
 *                                          (canonical desk root; any #fragment
 *                                          is preserved client-side by the
 *                                          browser, so bookmarked tab links
 *                                          like /mod/#/mod/queue keep working)
 *   mod.androidscroll.com /index.html   -> 301 to apex / (no mirrored homepage)
 *   mod.androidscroll.com *.html pages  -> 301 to the same path on apex
 *   mod.androidscroll.com other pages   -> 301 to the same path on apex
 *                                          (desk-only promise: no full-site
 *                                          mirror on the subdomain)
 *   mod.androidscroll.com static assets -> served from this same project
 *                                          (_astro/module JS is CORS-gated and
 *                                          fonts are same-origin: a cross-host
 *                                          redirect would break the desk, and
 *                                          from document root "/" the desk's
 *                                          page-relative "../_astro/.." refs
 *                                          resolve to "/_astro/.." which
 *                                          exists here)
 *   androidscroll.com /mod...           -> 301 to https://mod.androidscroll.com/
 *                                          (old bookmarks keep working; hash
 *                                          preserved client-side)
 *   everything else                     -> passthrough (zero behaviour change;
 *                                          GitHub Pages staging has no
 *                                          Functions, so /mod/ keeps serving
 *                                          there statically)
 *
 * Fails open: if Functions are ever disabled, the old behaviour returns
 * (apex /mod/ serves the desk) - never a dead bookmark.
 */

export const MOD_HOST = 'mod.androidscroll.com';
export const APEX_ORIGIN = 'https://androidscroll.com';
export const MOD_ORIGIN = 'https://mod.androidscroll.com';

/* Page paths (redirect to apex) vs static assets (serve locally) on the mod
   host. Anything with a file extension is an asset EXCEPT .html pages. */
export function isAssetPath(pathname) {
  if (pathname.endsWith('.html')) return false;
  const last = pathname.split('/').pop() || '';
  return last.includes('.');
}

export function isModPath(pathname) {
  return pathname === '/mod' || pathname.startsWith('/mod/');
}

/* Pure routing decision - unit-tested in CI-less harness (node), no I/O. */
export function decide(hostname, pathname, search) {
  const q = search || '';
  if (hostname === MOD_HOST) {
    if (pathname === '/' || pathname === '') return { type: 'rewrite', to: '/mod/' };
    if (isModPath(pathname)) return { type: 'redirect', to: MOD_ORIGIN + '/' + q, status: 301 };
    if (pathname === '/index.html') return { type: 'redirect', to: APEX_ORIGIN + '/' + q, status: 301 };
    if (isAssetPath(pathname)) return { type: 'next' };
    return { type: 'redirect', to: APEX_ORIGIN + pathname + q, status: 301 };
  }
  if (hostname === 'androidscroll.com' || hostname === 'www.androidscroll.com') {
    if (isModPath(pathname)) return { type: 'redirect', to: MOD_ORIGIN + '/' + q, status: 301 };
  }
  return { type: 'next' };
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const d = decide(url.hostname, url.pathname, url.search);
  if (d.type === 'redirect') return Response.redirect(d.to, d.status);
  if (d.type === 'rewrite') {
    const assetUrl = new URL(d.to, url.origin);
    return context.env.ASSETS.fetch(new Request(assetUrl, context.request));
  }
  return context.next();
}
