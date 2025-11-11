// sw.js

const CACHE_NAME = 'casamento-app-v5'; // Versão do cache incrementada
// Lista de arquivos essenciais para o funcionamento offline do app.
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/admin.html',
  '/css/style.css',
  '/js/app.js',
  '/js/ui.js',
  '/js/firebase-service.js',
  '/js/config.js',
  '/js/notifications.js',
  '/js/admin-app.js',
  '/js/admin-ui.js',
];

// Evento de instalação: abre o cache e armazena os arquivos.
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pré-cache de arquivos da aplicação');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Evento de ativação: limpa caches antigos se houver.
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removendo cache antigo', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Evento de fetch: implementa a estratégia Stale-While-Revalidate
self.addEventListener('fetch', (evt) => {
  if (evt.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(evt.request.url);

  // Se a requisição for para uma origem diferente (ex: Google, Firebase, CDN),
  // não tente fazer cache. Apenas busque da rede.
  if (requestUrl.origin !== self.location.origin) {
    evt.respondWith(
      fetch(evt.request).catch((err) => {
        console.error('[ServiceWorker] Falha ao buscar recurso de origem cruzada:', evt.request.url, err);
      })
    );
    return;
  }

  // Se for uma requisição local (do seu próprio site), use a estratégia Stale-While-Revalidate
  evt.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(evt.request);

      const fetchPromise = fetch(evt.request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(evt.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
        console.error('[ServiceWorker] Fetch local falhou:', evt.request.url, err);
        // Se a rede falhar (offline), retorna o cache se existir
        return cachedResponse; 
      });

      // Retorna o cache se existir, senão aguarda a rede
      return cachedResponse || fetchPromise;
    })
  );
});