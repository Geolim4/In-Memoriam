const CACHE_ASSETS = 'pwa_assets-' + (new Date()).toISOString().slice(0, 10);
const assets = [
  'assets/images/github/forkme_right_darkblue_121621.png',
  'assets/images/github/forkme_right_white_ffffff.png',
  'assets/images/house/admpen.png',
  'assets/images/house/pn-m.png',
  'assets/images/house/gd.png',
  'assets/images/house/armee.png',
  'assets/images/house/admpen-m.png',
  'assets/images/house/pm-m.png',
  'assets/images/house/armee-m.png',
  'assets/images/house/pompier-m.png',
  'assets/images/house/pompier.png',
  'assets/images/house/secciv-m.png',
  'assets/images/house/pm.png',
  'assets/images/house/misc-m.png',
  'assets/images/house/douane-m.png',
  'assets/images/house/douane.png',
  'assets/images/house/pn.png',
  'assets/images/house/secciv.png',
  'assets/images/house/misc.png',
  'assets/images/house/gd-m.png',
  'assets/images/map/bluedot.png',
  'assets/images/map/refresh.png',
  'assets/images/map/random.png',
  'assets/images/map/clustering_off.png',
  'assets/images/map/clustering_on.png',
  'assets/images/map/list.png',
  'assets/images/map/chart.png',
  'assets/images/map/heatmap_on.png',
  'assets/images/map/download.png',
  'assets/images/map/heatmap_off.png',
  'assets/images/pwa/in-memoriam_192.png',
  'assets/images/pwa/in-memoriam_512.png',
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_ASSETS)
    .then(function(cache) {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if ([CACHE_ASSETS].indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(
    event.request.url
  );

  if (requestUrl.pathname.includes("assets/images") && requestUrl.hostname === self.location.hostname) {
    const promiseResponse = caches.open(CACHE_ASSETS)
    .then(function(cache) {
      return cache.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
          .then(function(response) {
            cache.put(
              event.request,
              response.clone()
            );

            return response;
          });
        }
      });

    });
    event.respondWith(promiseResponse);
  }
});
