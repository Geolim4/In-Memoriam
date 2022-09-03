/** SW auto-generated on 2022-09-03T22:43:41.005Z **/
const CACHE_KEY = 'pwa_assets-2.8.2';
const assets = [
  'assets/images/github/forkme_right_darkblue_121621.png',
  'assets/images/github/forkme_right_white_ffffff.png',
  'assets/images/house/admpen-m.png',
  'assets/images/house/admpen.png',
  'assets/images/house/armee-m.png',
  'assets/images/house/armee.png',
  'assets/images/house/douane-m.png',
  'assets/images/house/douane.png',
  'assets/images/house/gd-m.png',
  'assets/images/house/gd.png',
  'assets/images/house/misc-m.png',
  'assets/images/house/misc.png',
  'assets/images/house/pm-m.png',
  'assets/images/house/pm.png',
  'assets/images/house/pn-m.png',
  'assets/images/house/pn.png',
  'assets/images/house/pompier-m.png',
  'assets/images/house/pompier.png',
  'assets/images/house/secciv-m.png',
  'assets/images/house/secciv.png',
  'assets/images/map/bluedot.png',
  'assets/images/map/chart.png',
  'assets/images/map/clustering_off.png',
  'assets/images/map/clustering_on.png',
  'assets/images/map/download.png',
  'assets/images/map/heatmap_off.png',
  'assets/images/map/heatmap_on.png',
  'assets/images/map/list.png',
  'assets/images/map/random.png',
  'assets/images/map/refresh.png',
  'assets/images/pwa/in-memoriam_192_maskable.png',
  'assets/images/pwa/in-memoriam_192.png',
  'assets/images/pwa/in-memoriam_512_maskable.png',
  'assets/images/pwa/in-memoriam_512.png',
  'assets/templates/associations.html.twig',
  'assets/templates/bloodbath-chart.html.twig',
  'assets/templates/bloodbath-list.html.twig',
  'assets/templates/definitions.html.twig',
  'assets/templates/infowindow-death.html.twig',
  'assets/templates/modals/content-infowindow-error.html.twig',
  'assets/templates/modals/modal-info.html.twig',
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_KEY)
    .then(function(cache) {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return CACHE_KEY !== cacheName;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
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
    const promiseResponse = caches.open(CACHE_KEY)
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
