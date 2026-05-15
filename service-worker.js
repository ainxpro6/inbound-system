const CACHE_NAME = 'inbound-scanner-v1';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Saat diinstall, simpan semua file ke memori cache HP
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache berhasil dibuka');
        return cache.addAll(urlsToCache);
      })
  );
});

// Saat aplikasi dibuka, cek apakah file ada di cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Kalau ada di cache, gunakan itu. Kalau nggak, ambil dari internet.
        return response || fetch(event.request);
      })
  );
});