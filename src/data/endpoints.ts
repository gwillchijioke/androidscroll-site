// Worker rails in ONE place (PORTABILITY-1 fix, v0.6.63).
// Build-time override: PUBLIC_COMMENTS_API / PUBLIC_PUSH_API (e.g. .env file
// or `PUBLIC_COMMENTS_API=https://... npm run build`). Fallbacks are the live
// rails so a plain `npm run build` behaves exactly as before.
export const COMMENTS_API =
  import.meta.env.PUBLIC_COMMENTS_API ||
  'https://androidscroll-comments.gwill.workers.dev';
export const PUSH_API =
  import.meta.env.PUBLIC_PUSH_API ||
  'https://androidscroll-push.gwill.workers.dev';
