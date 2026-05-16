const CACHE_VERSION = 'cryptoharvest-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/react.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/react-dom.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.22.20/babel.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/lucide/latest/umd/lucide.min.js',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Poppins:wght@300;400;600;700&display=swap'
];

// Установка Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Продолжить работу, даже если некоторые ресурсы недоступны
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Обработка запросов с стратегией "Network first, cache fallback"
self.addEventListener('fetch', event => {
  const { request } = event;

  // GET запросы
  if (request.method === 'GET') {
    // Для HTML файлов - сначала сеть, потом кэш
    if (request.mode === 'navigate' || request.destination === 'document') {
      event.respondWith(
        fetch(request)
          .then(response => {
            if (response && response.status === 200) {
              const responseClone = response.clone();
              caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            return caches.match(request).then(response => {
              return response || caches.match('/index.html');
            });
          })
      );
    } else {
      // Для других ресурсов - стратегия "cache first"
      event.respondWith(
        caches.match(request)
          .then(response => {
            if (response) {
              return response;
            }

            return fetch(request)
              .then(response => {
                if (!response || response.status !== 200 || response.type === 'error') {
                  return response;
                }

                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE).then(cache => {
                  cache.put(request, responseClone);
                });

                return response;
              })
              .catch(error => {
                console.log('Fetch failed: ', error);
                // Вернуть offline страницу, если необходимо
                return new Response('Offline - ресурс недоступен', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'text/plain'
                  })
                });
              });
          })
      );
    }
  } else {
    // Для неGET запросов - просто отправить в сеть
    event.respondWith(fetch(request));
  }
});

// Background sync для синхронизации данных когда онлайн
self.addEventListener('sync', event => {
  if (event.tag === 'sync-earnings') {
    event.waitUntil(
      // Здесь можно добавить логику синхронизации доходов
      Promise.resolve()
    );
  }
});

// Push уведомления
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'CryptoHarvest Уведомление';
  const options = {
    body: data.body || 'Новое уведомление',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'cryptoharvest-notification',
    requireInteraction: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Если окно приложения открыто, сфокусировать его
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].url === '/' && 'focus' in clientList[i]) {
          return clientList[i].focus();
        }
      }
      // Если окно не открыто, открыть его
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});