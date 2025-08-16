const CACHE_NAME = 'casamento-app-v4';
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
  '/js/admin-app.js',
  '/js/admin-ui.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
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

// Evento de fetch: intercepta as requisições e serve do cache primeiro.
self.addEventListener('fetch', (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((response) => {
      // Se a resposta estiver no cache, retorna ela. Senão, busca na rede.
      return response || fetch(evt.request);
    })
  );
});