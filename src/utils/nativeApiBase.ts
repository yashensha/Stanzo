// In the Capacitor shell the page is served from https://localhost, so relative `/api/...`
// requests would hit the bundled app instead of the Worker. When the build sets
// VITE_API_BASE (only `--mode capacitor` does), rewrite those requests to the Worker.
// Web builds leave VITE_API_BASE empty and keep using the same-origin Pages proxy.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '')

/**
 * Turns a stored relative `/api/...` link (voice memo audio, scrapbook images) into one the
 * current build can load. Use it where a link is rendered (src/href), not where it's saved,
 * so stored data stays origin-independent.
 */
export function resolveApiUrl(url: string): string
export function resolveApiUrl(url: string | undefined): string | undefined
export function resolveApiUrl(url: string | undefined): string | undefined {
  if (!API_BASE || !url || !url.startsWith('/api/')) return url
  return API_BASE + url
}

/** y-websocket server URL for real-time collaboration (the Worker's `/ws` route). */
export function collabWsUrl(): string {
  const configured = import.meta.env.VITE_COLLAB_WS_URL as string | undefined
  if (configured) return configured
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export function installNativeApiBase(): void {
  if (!API_BASE) return
  const nativeFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
    nativeFetch(typeof input === 'string' ? resolveApiUrl(input) : input, init)
}
