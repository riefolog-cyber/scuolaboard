// sw.js · Service worker PWA di ScuolaBoard
// Strategia: cache-first per gli asset con hashing (immutabili), network-first
// per le navigazioni con fallback all'app shell salvata in cache (offline).
// I dati (Firestore) e le chiamate AI passano comunque dalla rete.
// Cache naming: a ogni deploy con modifiche rilevanti (es. fix di logout)
// BUMPARE CACHE (scuolaboard-vX). L'activate purga comunque in automatico le
// cache "stale": quelle di versioni precedenti senza meta vengono eliminate
// subito, quelle recenti (installate da meno di 30 giorni) restano per non
// rompere l'offline di client ancora aperti sulla shell precedente.
var CACHE = 'scuolaboard-v3';
var META_URL = './__sb_cache_meta__';
var CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches
      .open(CACHE)
      .then(function (c) {
        // Pre-cache dell'app shell: il percorso relativo parte da /scuolaboard/
        return c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg']).catch(function () {});
      })
      .then(function () {
        // Timestamp di installazione, usato dall'activate per la pulizia automatica
        return caches.open(CACHE).then(function (c) {
          return c.put(META_URL, new Response(String(Date.now())));
        });
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
              return caches.open(k).then(function (c) {
                return c.match(META_URL).then(function (meta) {
                  // Senza meta = cache di versioni legacy (pre-v3): elimina subito.
                  if (!meta) return caches.delete(k);
                  return meta.text().then(function (txt) {
                    var installedAt = parseInt(txt, 10);
                    if (isNaN(installedAt)) return caches.delete(k);
                    // Cache recente (altri client potrebbero usarla ancora): tieni.
                    if (Date.now() - installedAt <= CACHE_MAX_AGE_MS) return undefined;
                    return caches.delete(k);
                  });
                });
              });
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
  // La meta di installazione non va mai servita né messa in cache.
  if (url.pathname.indexOf(META_URL) >= 0) return;

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
