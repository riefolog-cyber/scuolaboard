// sw.js · Service worker PWA di ScuolaBoard
// Strategia: cache-first per gli asset con hashing (immutabili), network-first
// per le navigazioni con fallback all'app shell salvata in cache (offline).
// I dati (Firestore) e le chiamate AI passano comunque dalla rete.
var CACHE = 'scuolaboard-v1';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(function (c) {
        // Pre-cache dell'app shell: il percorso relativo parte da /scuolaboard/
        return c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg']).catch(function () {});
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE;
            })
            .map(function (k) {
              return caches.delete(k);
            })
        );
      })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Navigazioni: network-first, fallback all'app shell cache.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) {
            c.put('./index.html', copy);
          });
          return res;
        })
        .catch(function () {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // Asset statici: cache-first con aggiornamento in background (stale-while-revalidate).
  e.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) {
              c.put(req, copy);
            });
          }
          return res;
        })
        .catch(function () {
          return cached;
        });
      return cached || network;
    })
  );
});
