// sanitize-body.ts - P47 WP EXIT: server-side allowlist sanitizer for WP body HTML.
// Zero deps. Bodies are trusted exports, but defense-in-depth: strip anything
// executable while preserving approved prose, headings (+ids for TOC/anchors),
// images, tables and code blocks byte-equal otherwise.
const ALLOWED = new Set([
  'p','h2','h3','h4','ul','ol','li','a','img','figure','figcaption',
  'blockquote','code','pre','strong','em','b','i','table','thead','tbody',
  'tr','th','td','hr','br','span','div','sup','sub',
]);
const ALLOWED_ATTR = new Set([
  'href','src','srcset','sizes','alt','title','width','height',
  'loading','decoding','class','id','colspan','rowspan','target','rel',
]);

function escAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function cleanTag(tag: string): string {
  const m = /^<\/?([a-zA-Z0-9]+)((?:\s+[^<>]*)?)\/?>$/.exec(tag.trim());
  if (!m) return '';
  const name = m[1].toLowerCase();
  if (!ALLOWED.has(name)) return '';
  const closing = tag.trim().startsWith('</');
  if (closing) return `</${name}>`;
  let attrs = '';
  const attrRe = /([a-zA-Z-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
  let a: RegExpExecArray | null;
  while ((a = attrRe.exec(m[2] || ''))) {
    const an = a[1].toLowerCase();
    if (!ALLOWED_ATTR.has(an)) continue;
    let av = a[2] || '';
    if (/^["']/.test(av)) av = av.slice(1, -1);
    if ((an === 'href' || an === 'src' || an === 'srcset')) {
      const low = av.trim().toLowerCase();
      if (/^(javascript|data|vbscript|file):/.test(low)) continue;
    }
    if (an === 'target' && av !== '_blank') continue;
    attrs += ` ${an}="${escAttr(av)}"`;
  }
  const selfClose = name === 'img' || name === 'hr' || name === 'br';
  return selfClose ? `<${name}${attrs}>` : `<${name}${attrs}>`;
}

function slugify(t: string): string {
  return t.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function sanitizeBody(dirty: string): string {
  // Strip comments, scripts/styles/iframes/forms with content, event handlers die with attrs.
  let s = dirty.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(script|style|iframe|form|input|button|object|embed|link|meta)[\s\S]*?<\/\1\s*>/gi, '');
  s = s.replace(/<(script|style|iframe|object|embed|link|meta)[^<>]*\/?>/gi, '');
  const parts = s.split(/(<[^<>]+>)/g);
  let out = '';
  const seen = new Set<string>();
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part.startsWith('<')) { out += part; continue; }
    const m = /^<([a-zA-Z0-9]+)/.exec(part.trim());
    const name = m ? m[1].toLowerCase() : '';
    if ((name === 'h2' || name === 'h3') && !part.trim().startsWith('</')) {
      // Ensure heading ids (TOC + anchors). Collect text until closing tag.
      let text = '';
      for (let j = i + 1; j < parts.length; j++) {
        if (/^<\//.test(parts[j])) break;
        if (!parts[j].startsWith('<')) text += parts[j];
      }
      if (!/\sid\s*=/.test(part)) {
        let id = slugify(text) || 'section';
        let n = 2; const base = id;
        while (seen.has(id)) id = `${base}-${n++}`;
        seen.add(id);
        out += cleanTag(part.replace(/>$/, ` id="${id}">`));
        continue;
      }
      const idm = /\sid\s*=\s*["']?([^"'\s>]+)/.exec(part);
      if (idm) seen.add(idm[1]);
    }
    out += cleanTag(part);
  }
  return out;
}
