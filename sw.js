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
  // Ignora requisições que não são GET
  if (evt.request.method !== 'GET') {
    return;
  }

  evt.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(evt.request);

      const fetchPromise = fetch(evt.request).then((networkResponse) => {
        // Se a requisição for bem-sucedida, atualiza o cache
        if (networkResponse.ok) {
            cache.put(evt.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
        console.error('[ServiceWorker] Fetch falhou:', err);
      });

      // Retorna o conteúdo do cache imediatamente se disponível,
      // enquanto a rede busca a atualização em segundo plano.
      return cachedResponse || fetchPromise;
    })
  );
});