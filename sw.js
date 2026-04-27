// Service Worker per ScuolaBoard - Ottimizzazione #7
var CACHE_NAME='scuolaboard-v1';
var urlsToCache=[
  './',
  'index.html',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

self.addEventListener('install',function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      console.log('[SW] Cache aperta');
      return cache.addAll(urlsToCache);
    }).catch(function(err){console.log('[SW] Errore cache iniziale:',err);})
  );
  self.skipWaiting();
});

self.addEventListener('activate',function(event){
  event.waitUntil(
    caches.keys().then(function(cacheNames){
      return Promise.all(
        cacheNames.filter(function(cn){return cn!==CACHE_NAME;}).map(function(cn){
          console.log('[SW] Elimino vecchia cache:',cn);
          return caches.delete(cn);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch',function(event){
  var url=event.request.url;
  // Per risorse esterne (CDN), usa cache-first
  if(url.indexOf('gstatic.com')>=0||url.indexOf('cloudflare.com')>=0||url.indexOf('googleapis.com')>=0){
    event.respondWith(
      caches.match(event.request).then(function(response){
        if(response){
          console.log('[SW] Servito da cache:',url);
          return response;
        }
        return fetch(event.request).then(function(response){
          if(!response||response.status!==200||response.type!=='basic'){return response;}
          var responseToCache=response.clone();
          caches.open(CACHE_NAME).then(function(cache){cache.put(event.request,responseToCache);});
          return response;
        });
      }).catch(function(){return fetch(event.request);})
    );
    return;
  }
  // Per risorse locali, network-first con fallback su cache
  event.respondWith(
    fetch(event.request).then(function(response){
      var responseToCache=response.clone();
      caches.open(CACHE_NAME).then(function(cache){cache.put(event.request,responseToCache);});
      return response;
    }).catch(function(){
      console.log('[SW] Fallback su cache per:',url);
      return caches.match(event.request);
    })
  );
});
