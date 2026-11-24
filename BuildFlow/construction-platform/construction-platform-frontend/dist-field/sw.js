/* Whitis Field service worker: keeps the app itself on the phone so it opens with no signal.
 * It never stores API answers (the app keeps its own copy of the last job it saw) or anything signed in. */
const VERSION = 'v1';
const SHELL = `bf-field-shell-${VERSION}`;
const ASSETS = `bf-field-assets-${VERSION}`;
const MEDIA = `bf-field-media-${VERSION}`;
const KEEP = [SHELL, ASSETS, MEDIA];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(SHELL).then((c) => c.add('/field/')).then(() => self.skipWaiting())); });

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((names) => Promise.all(names.filter((n) => n.startsWith('bf-field-') && !KEEP.includes(n)).map((n) => caches.delete(n)))).then(() => self.clients.claim()));
});

async function trim(name, max) {
  const c = await caches.open(name); const keys = await c.keys();
  for (let i = 0; i < keys.length - max; i++) await c.delete(keys[i]);
}

async function cacheFirst(req, name, max) {
  const c = await caches.open(name);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) { c.put(req, res.clone()); if (max) trim(name, max); }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/field/')) return;
  if (url.pathname.startsWith('/field/api/')) return;                                  // the app handles its own data
  if (url.pathname.startsWith('/field/assets/')) { e.respondWith(cacheFirst(req, ASSETS)); return; }   // hashed, never changes
  if (url.pathname.startsWith('/field/media/')) { e.respondWith(cacheFirst(req, MEDIA, 300)); return; } // photo addresses never change
  if (req.mode === 'navigate') {
    // Open the app shell from the network when there is signal, from the phone when there is not.
    e.respondWith((async () => {
      try {
        const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
        const c = await caches.open(SHELL); c.put('/field/', res.clone()); return res;
      } catch { const c = await caches.open(SHELL); return (await c.match('/field/')) || Response.error(); }
    })());
  }
});
