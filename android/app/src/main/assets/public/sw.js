const CACHE = 'wl-2b4d75f5d6'
const FILES = ["./","./assets/bricolage-grotesque-latin-ext-wght-normal-CcLUaPy7.woff2","./assets/bricolage-grotesque-latin-wght-normal-DLoelf7F.woff2","./assets/bricolage-grotesque-vietnamese-wght-normal-BUzh504Q.woff2","./assets/index-C_6oTTsg.js","./assets/index-I3rALFqf.css","./assets/manrope-cyrillic-wght-normal-Dvxsihut.woff2","./assets/manrope-greek-wght-normal-DL7QRZyv.woff2","./assets/manrope-latin-ext-wght-normal-Ch3YOpNY.woff2","./assets/manrope-latin-wght-normal-DHIcAJRg.woff2","./assets/manrope-vietnamese-wght-normal-usUDDRr7.woff2","./assets/web-BYN8CTdN.js","./assets/web-CXGwl5Yx.js","./assets/web-CZjUv0KF.js","./assets/web-D21VYix9.js","./assets/web-DDMccQWh.js","./favicon.svg","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./index.html","./manifest.webmanifest","./runners/background.js"]

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))))

self.addEventListener('message', (e) => {
  if (e.data === 'skip') self.skipWaiting()
})

self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('wl-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
)

self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(
    caches.match(r, { ignoreSearch: true, ignoreVary: true }).then((hit) => hit || (r.mode === 'navigate' ? caches.match('./index.html') : undefined) || fetch(r)),
  )
})
