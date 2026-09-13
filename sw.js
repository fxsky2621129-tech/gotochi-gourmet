const PREFIX = 'gotochi-gourmet:' + new URL(self.registration.scope).pathname + ':';
const CACHE = PREFIX + 'v1.2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './favicon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic') {
        await cache.put(event.request.mode === 'navigate' ? new URL('./index.html', scope).href : event.request, response.clone());
      }
      return response;
    } catch (error) {
      const fallback = await cache.match(event.request.mode === 'navigate' ? new URL('./index.html', scope).href : event.request);
      return fallback || new Response('オフラインでは開けません。接続を確認してください。', {status:503,headers:{'Content-Type':'text/plain;charset=UTF-8'}});
    }
  })());
});
