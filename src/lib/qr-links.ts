/**
 * Only VYZUN destinations on this app's origin (or vyzun.app) are opened from a scanned QR.
 * Returns an in-app path, or null for anything else.
 */
const ALLOWED = [/^\/ask\/@?[a-z0-9_%.-]{1,40}$/i, /^\/invite\/[a-z0-9_]{1,30}$/i, /^\/profile$/, /^\/reels$/];

export function resolveScannedLink(raw: string, origin: string): string | null {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  const host = new URL(origin).host;
  if (url.host !== host && url.host !== "vyzun.app" && url.host !== "www.vyzun.app") return null;
  if (!ALLOWED.some(rule => rule.test(url.pathname))) return null;
  return url.pathname + url.search;
}
