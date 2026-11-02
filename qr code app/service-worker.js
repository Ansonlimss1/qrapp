const CACHE = 'qrly-shell-v5';
const ASSETS = ['./', './index.html', './styles.css?v=5', './app.js?v=5', './manifest.webmanifest?v=5', './assets/wallet-art.png', './assets/wallet-app-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const network = fetch(event.request, {cache:'no-store'});
  event.respondWith(network.catch(() => caches.match(event.request)));
  event.waitUntil(network.then(response => response.ok ? caches.open(CACHE).then(cache => cache.put(event.request, response.clone())) : undefined).catch(() => {}));
});
