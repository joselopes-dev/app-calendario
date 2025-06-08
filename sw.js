const CACHE_NAME = 'calendario-cache-v2';
const OFFLINE_PAGE = '/index.html';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // Cuidado com URLs externas: elas podem falhar no addAll
  // Melhor pré-carregar manualmente se necessário
];

// Instala e adiciona arquivos ao cache
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Força ativação imediata do novo SW
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cacheando recursos estáticos');
        return cache.addAll(ASSETS);
      })
      .catch((err) => {
        console.error('Erro durante instalação do SW:', err);
      })
  );
});

// Remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('Removendo cache antigo:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim(); // Pega controle imediatamente
});

// Intercepta as requisições e serve o cache
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        const fetchAndUpdate = async () => {
          try {
            const networkResponse = await fetch(event.request);

            if (networkResponse && networkResponse.status === 200) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(event.request, networkResponse.clone());
            }

            return networkResponse;
          } catch (err) {
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_PAGE);
            }
            throw err;
          }
        };

        return cachedResponse || fetchAndUpdate();
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
      })
  );
});
