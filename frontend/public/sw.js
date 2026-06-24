const CACHE_VERSION = 'v3';
const STATIC_CACHE  = `static-${CACHE_VERSION}`;
const API_CACHE     = `api-${CACHE_VERSION}`;

const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

// ─── Install: キャッシュに静的アセットを追加 ──────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: 古いキャッシュを削除 ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== STATIC_CACHE && k !== API_CACHE).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// キャッシュ対象外のリクエストか判定（Vite 開発ファイルなど）
function shouldSkipCache(url) {
  const pathname = url.pathname;
  // Vite 開発サーバーのソースファイルはキャッシュしない
  if (pathname.startsWith('/src/')) return true;
  if (pathname.startsWith('/node_modules/')) return true;
  if (url.search.includes('v=') && pathname.endsWith('.js')) return true;
  // Vite HMR
  if (pathname.startsWith('/@')) return true;
  return false;
}

// ─── Fetch: ネットワーク優先 (API) / キャッシュ優先 (静的) ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // クロスオリジンリクエストはスルー
  if (url.origin !== self.location.origin) return;

  // Vite 開発ファイルはサービスワーカーを通さない（直接 fetch）
  if (shouldSkipCache(url)) return;

  // API リクエスト: ネットワーク優先
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached ?? new Response(JSON.stringify({ success: false, error: { message: 'オフラインです' } }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            })
          )
        )
    );
    return;
  }

  // 静的アセット: キャッシュ優先、なければネットワーク
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() =>
            // ネットワークもキャッシュも失敗した場合は 503
            new Response('Service unavailable', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          );
      })
    );
  }
});

// ─── Push通知ハンドラ ──────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: '資格スケジュール', body: 'お知らせがあります', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  '/icon-192.svg',
      badge: '/favicon.svg',
      data:  { url: data.url },
      vibrate: [200, 100, 200],
    })
  );
});

// ─── 通知クリック時にアプリを開く ────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
