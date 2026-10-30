/* =========================================================
   幼童軍歷險 — Service Worker
   ---------------------------------------------------------
   策略：
   · 頁面導航 (mode === 'navigate') → network-first，斷線時退回 cache
     （保證團長改完題目，小朋友下次開 app 就拿到最新版本）
   · 靜態資源 (css / js / icon)     → cache-first + 背景更新
     (stale-while-revalidate，即開即用，同時靜靜地更新)
   · 跨來源請求一律不攔截
   · /sw.js 自身永不快取（否则更新推不出去）

   ★ 發佈須知：每次改動 css/js/內容後，把下面 CACHE 的版本號
     bump 一級（例如 cubgame-v0.4.1），activate 時就會清走舊 cache。
   ========================================================= */

const CACHE = 'cubgame-v0.4.1';

const SHELL = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/data.js',
  '/js/logic.js',
  '/manifest.webmanifest',
  '/icons/favicon-32.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png'
];

/* ---- install：預先快取 app shell ----
   逐個 add 而非 addAll：addAll 是 all-or-nothing，
   一個檔 404 就會令成個 SW 安裝失敗。 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.all(
        SHELL.map(url => cache.add(url).catch(() => {
          console.warn('[sw] 快取失敗（略過）：' + url);
        }))
      ))
      .then(() => self.skipWaiting())
  );
});

/* ---- activate：清走舊版本 cache，即刻接管 ---- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---- fetch ---- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 跨來源：唔好掂
  if (url.pathname === '/sw.js') return;             // SW 自身：唔好快取

  /* 導航請求 → network-first，失敗先退回 cache */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match(req)
          .then(hit => hit || caches.match('/index.html')))
    );
    return;
  }

  /* 其他資源 → stale-while-revalidate */
  event.respondWith(
    caches.match(req).then(hit => {
      const revalidate = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => hit);

      return hit || revalidate;
    })
  );
});
