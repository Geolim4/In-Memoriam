/** SW auto-generated on 2022-10-29T01:30:58.328Z **/
const CACHE_KEY = 'im-3.5.7+20221029T013058';
const assets = [
  'assets/css/fonts/glyphicons-halflings-regular.eot',
  'assets/css/fonts/glyphicons-halflings-regular.svg',
  'assets/css/fonts/glyphicons-halflings-regular.ttf',
  'assets/css/fonts/glyphicons-halflings-regular.woff',
  'assets/css/fonts/glyphicons-halflings-regular.woff2',
  'assets/css/main.css',
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
  'assets/images/map/timelapse.png',
  'assets/images/map/user_config.png',
  'assets/images/pwa/in-memoriam_192_maskable.png',
  'assets/images/pwa/in-memoriam_192.png',
  'assets/images/pwa/in-memoriam_512_maskable.png',
  'assets/images/pwa/in-memoriam_512.png',
  'assets/js/app.js',
  'assets/json/deaths/2018.min.json',
  'assets/json/deaths/2019.min.json',
  'assets/json/deaths/2020.min.json',
  'assets/json/deaths/2021.min.json',
  'assets/json/deaths/2022.min.json',
  'assets/json/deaths/2023.min.json',
  'assets/templates/advanced-search-link.html.twig',
  'assets/templates/associations.html.twig',
  'assets/templates/bloodbath-chart.html.twig',
  'assets/templates/bloodbath-list.html.twig',
  'assets/templates/definitions.html.twig',
  'assets/templates/infowindow-death.html.twig',
  'assets/templates/modals/content/advanced-search.html.twig',
  'assets/templates/modals/content/cookie-consent-declined.html.twig',
  'assets/templates/modals/content/infowindow-error.html.twig',
  'assets/templates/modals/form/user-config.html.twig',
  'assets/templates/modals/modal-info.html.twig',
  'assets/templates/modals/pages/confidentiality.html.twig',
  'assets/templates/modals/pages/contact-us.html.twig',
  'assets/templates/modals/pages/legal-notice.html.twig',
  'assets/templates/modals/pages/licence-gpl-2.0.html.twig',
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

  if (requestUrl.pathname.includes("assets/") && requestUrl.hostname === self.location.hostname) {
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
