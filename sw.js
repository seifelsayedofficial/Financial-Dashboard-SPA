const CACHE_NAME = 'alexandria-office-v1';
const ASSETS = [
  './',
  './index.html',
  './js/app.js',
  './js/state.js',
  './js/router.js',
  './js/utils.js',
  './js/api.js',
  './js/components.js',
  './js/pages/dashboard.js',
  './js/pages/client-invoices.js',
  './js/pages/shipping-invoices.js',
  './js/pages/bank-transfers.js',
  './js/pages/account-statement.js',
  './js/pages/admin.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
