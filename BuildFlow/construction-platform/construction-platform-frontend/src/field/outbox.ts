import { useEffect, useState } from 'react';
import { ApiError, call, getToken } from './api';

/**
 * Everything the crew enters (daily logs, punch items, start/finish taps) goes into a queue on the phone first,
 * photos included, and is sent as soon as there is signal. Nothing is lost if the signal drops or the app closes.
 * Each log and punch item has an id made on the phone, so a retry after a half-finished send never makes a copy.
 */
export type Kind = 'log' | 'punch' | 'item' | 'resolve';
export interface Entry {
  id: string; kind: Kind; projectId: string;
  payload: any;
  photos: Blob[];          // shrunk JPEGs waiting to upload
  uploaded: string[];      // addresses of photos already uploaded (so a retry doesn't upload them twice)
  createdAt: number;
  error?: string;          // the server refused it; the person can retry or discard
}

const DB = 'bf-field';
const STORE = 'outbox';
let dbp: Promise<IDBDatabase> | null = null;
const open = () => (dbp ??= new Promise((resolve, reject) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => { dbp = null; reject(r.error); };
}));
const run = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise((resolve, reject) => { const req = fn(db.transaction(STORE, mode).objectStore(STORE)); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
};

const bus = new EventTarget();
const changed = () => bus.dispatchEvent(new Event('change'));
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`);

export const listOutbox = async (): Promise<Entry[]> => ((await run('readonly', (s) => s.getAll())) as Entry[]).sort((a, b) => a.createdAt - b.createdAt);
const put = (e: Entry) => run('readwrite', (s) => s.put(e));
export const discard = async (id: string) => { await run('readwrite', (s) => s.delete(id)); changed(); };
export const clearOutbox = async () => { try { await run('readwrite', (s) => s.clear()); } catch { /* no database yet */ } changed(); };

type NewEntry = { kind: Kind; projectId: string; payload: any; photos?: Blob[]; id?: string };
export async function enqueue(n: NewEntry): Promise<string> {
  // Start/finish taps are "the latest one wins" per item, not a history.
  const id = n.id ?? (n.kind === 'item' ? `item:${n.payload.itemId}` : n.kind === 'resolve' ? `resolve:${n.payload.punchId}` : uuid());
  await put({ id, kind: n.kind, projectId: n.projectId, payload: n.payload, photos: (n.photos ?? []).slice(0, 12), uploaded: [], createdAt: Date.now() });
  changed();
  void flush();
  return id;
}

export async function retry(id: string) {
  const e = (await listOutbox()).find((x) => x.id === id);
  if (e) { delete e.error; await put(e); changed(); void flush(); }
}

function send(e: Entry) {
  const photos = e.uploaded.map((url) => ({ url }));
  switch (e.kind) {
    case 'log': return call('POST', `/jobs/${e.projectId}/daily-logs`, { ...e.payload, clientId: e.id, photos });
    case 'punch': return call('POST', `/jobs/${e.projectId}/punch`, { ...e.payload, clientId: e.id, photos });
    case 'item': return call('PATCH', `/schedule/${e.payload.itemId}`, { status: e.payload.status, progress: e.payload.progress });
    case 'resolve': return call('POST', `/punch/${e.payload.punchId}/resolve`);
  }
}

let running = false;
export const isFlushing = () => running;

/** Sends what is waiting, oldest first. Stops at the first sign of no signal and keeps the order. */
export async function flush(): Promise<void> {
  if (running || !getToken()) return;
  running = true; changed();
  try {
    for (const e of await listOutbox()) {
      if (e.error) continue;
      try {
        for (let i = e.uploaded.length; i < e.photos.length; i++) {
          e.uploaded.push((await call<{ url: string }>('POST', '/photos', undefined, e.photos[i])).url);
          await put(e);
        }
        await send(e);
        await run('readwrite', (s) => s.delete(e.id));
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
        if (err.retryable || err.status === 401) break;
        e.error = err.message; await put(e);
      }
      changed();
    }
  } finally { running = false; changed(); }
}

// Try again whenever it might work: signal returns, the app comes back to the front, and every half minute.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void flush(); });
  setInterval(() => { void listOutbox().then((l) => { if (l.some((e) => !e.error)) void flush(); }).catch(() => {}); }, 30_000);
}

export function useOutbox() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sending, setSending] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    let alive = true;
    const refresh = () => { setSending(isFlushing()); void listOutbox().then((l) => { if (alive) setEntries(l); }).catch(() => {}); };
    const on = () => setOnline(true), off = () => setOnline(false);
    bus.addEventListener('change', refresh); window.addEventListener('online', on); window.addEventListener('offline', off);
    refresh();
    return () => { alive = false; bus.removeEventListener('change', refresh); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return { entries, sending, online, waiting: entries.filter((e) => !e.error).length, failed: entries.filter((e) => e.error).length };
}
