const CACHE_NAME = 'peluapp-v2026-11-24-2-v1795646985156-cal-1795647707247-restore-1795647999803-tdz-1795648270707-calext-1795648426433-items-1795648748797-sa-1795648928593-sa2-1795649213839-gear-1795649437350-cred-1795649659416-both-1795649753343-side2-1795649892575-v2-1795650037444-clean-1795650146633-sec-1795651587434-auth-1795654646480-nopin-1795654778470-mask-1795655014161-logout-1795655119100-btn-1795655460661-vbtn-1795655717581-logout2-1795655837128-clean-1795656095169-fixed-1795656208722-calbtn-1795656588541-cleanmodal-1795656752556-turnos-1795657662578-tabfix-1795658232428-mountfix-1795658422794-overlay-1795658593957-native-1795658865817-order-1795659002104-fixv-1795659213314-embed-1795659460132-tabfix-1795659657885-cancel-maestra-1795695632931-masterlock-1795696920077-sa-demo-1795697401547-demolic-1795697859040-masterv3-1795698218524-noautosuper-1795698344452';
const ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isHtml =
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html');

  if (isHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
