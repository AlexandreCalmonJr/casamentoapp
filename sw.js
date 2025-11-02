// sw.js
const CACHE_NAME = 'casamento-app-v1.0.5'; // Incrementei a versão

const urlsToCache = [
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
  '/js/pdf-generator.js',
  '/manifest.json',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png'
  // REMOVIDO: Tailwind CDN (causa erro de CORS)
  // REMOVIDO: Font Awesome CDN (causa erro de CORS)
];

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Pré-cache de arquivos');
        // Adiciona arquivos um por um e ignora erros
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[ServiceWorker] Falha ao cachear ${url}:`, err);
              return null;
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora requisições para CDNs externos
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('cdn.') || 
    url.hostname.includes('cloudinary.com') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    return; // Deixa o navegador fazer a requisição normalmente
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          // Não cacheia se não for uma resposta válida
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
      .catch(() => {
        // Retorna página offline se necessário (opcional)
        return caches.match('/index.html');
      })
  );
});