/** The crew API client (backend/src/routes/field.routes.ts) and the phone's offline copy of what it last saw. */
const BASE = '/field/api';
const TOKEN = 'bf-crew-token';
const CREW = 'bf-crew-id';
const CACHE = 'bf-cache:';

export const getToken = () => { try { return localStorage.getItem(TOKEN); } catch { return null; } };
export const getCrewId = () => { try { return localStorage.getItem(CREW); } catch { return null; } };

export class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
  /** No signal, or the server is briefly away: worth trying again later, not an answer. */
  get retryable() { return this.status === 0 || this.status >= 500 || this.status === 429; }
}

export async function call<T = any>(method: string, path: string, body?: unknown, photo?: Blob): Promise<T> {
  const headers: Record<string, string> = {};
  const t = getToken();
  if (t) headers.authorization = `Bearer ${t}`;
  if (photo) headers['content-type'] = 'image/jpeg';
  else if (body !== undefined) headers['content-type'] = 'application/json';
  let res: Response;
  try { res = await fetch(BASE + path, { method, headers, body: photo ?? (body === undefined ? undefined : JSON.stringify(body)) }); }
  catch { throw new ApiError(0, 'No signal'); }
  if (!res.ok) {
    let msg = res.statusText || 'Something went wrong';
    try { msg = ((await res.json()) as { error?: string }).error ?? msg; } catch { /* not json (a proxy error page) */ }
    if (res.status === 401 && t && !path.startsWith('/login') && !path.startsWith('/join')) window.dispatchEvent(new Event('bf-auth-lost'));
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

/** GET with a saved copy: with no signal, the last good answer is shown and flagged offline. */
export async function cachedGet<T>(key: string, path: string): Promise<{ data: T; offline: boolean }> {
  try {
    const data = await call<T>('GET', path);
    try { localStorage.setItem(CACHE + key, JSON.stringify(data)); } catch { /* storage full or private mode */ }
    return { data, offline: false };
  } catch (e) {
    if (e instanceof ApiError && e.retryable) {
      try { const raw = localStorage.getItem(CACHE + key); if (raw) return { data: JSON.parse(raw) as T, offline: true }; } catch { /* unreadable copy */ }
    }
    throw e;
  }
}

/** Starts a session. A different person on the same phone starts clean: nothing of the last person's is kept. */
export async function startSession(token: string, crewId: string, wipe: () => Promise<void>) {
  const prev = getCrewId();
  if (prev && prev !== crewId) { clearCache(); await wipe(); }
  try { localStorage.setItem(TOKEN, token); localStorage.setItem(CREW, crewId); } catch { /* ignore */ }
}

export function clearCache() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(CACHE) || k.startsWith('bf-draft:')) localStorage.removeItem(k); } catch { /* ignore */ }
}

export async function endSession(wipe: () => Promise<void>) {
  try { localStorage.removeItem(TOKEN); localStorage.removeItem(CREW); } catch { /* ignore */ }
  clearCache();
  await wipe();
}

/** Uploaded photos are served under the field app's own address. */
export const photoSrc = (url: string) => (url.startsWith('/media/') ? `/field${url}` : url);
