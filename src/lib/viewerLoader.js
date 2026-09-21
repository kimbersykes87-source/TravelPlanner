/**
 * Data loading for the read-only /view share link.
 * Viewers never talk to the database directly: the viewer-data Edge Function
 * checks the link's token and returns data without personal details.
 */
const TOKEN_KEY = 'travelPlanner_viewerToken';

/** Token from ?k=… (remembered for this browser tab so navigation keeps working). */
export function readViewerToken(search = window.location.search) {
  const fromUrl = new URLSearchParams(search).get('k');
  try {
    if (fromUrl) sessionStorage.setItem(TOKEN_KEY, fromUrl);
    return fromUrl || sessionStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return fromUrl || '';
  }
}

export function makeViewerLoader(token) {
  const base = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return async function loadViewerData() {
    if (!token) throw new Error('This share link is missing its access code. Ask Kimber or Siona for a new link.');
    const res = await fetch(`${base}/functions/v1/viewer-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ token }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || 'This share link is not valid. Ask Kimber or Siona for a new link.');
    return { data: body.data || {}, failed: body.failed || [] };
  };
}

/** Build a share link for a token. */
export function shareUrl(token, origin = window.location.origin) {
  return `${origin}/view?k=${encodeURIComponent(token)}`;
}
