// firebase-messaging-sw.js
// ⚠️ Este arquivo DEVE estar na RAIZ do projeto

importScripts('https://www.gstatic.com/firebasejs/9.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.10.0/firebase-messaging-compat.js');

// Configuração do Firebase
firebase.initializeApp({
    apiKey: "AIzaSyBJL0UmIxUyEEGvER5eTlO4zMSVOY7Czq0",
    authDomain: "casamentoapp-7467a.firebaseapp.com",
    projectId: "casamentoapp-7467a",
    storageBucket: "casamentoapp-7467a.firebasestorage.app",
    messagingSenderId: "351891200556",
    appId: "1:351891200556:web:5c1323fec30359a2794f89",
    measurementId: "G-HEYRFV09DH"
});

const messaging = firebase.messaging();

// Handler para mensagens recebidas em segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Mensagem recebida em segundo plano:', payload);
    
    const notificationTitle = payload.notification?.title || 'Nova Notificação';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: payload.notification?.icon || '/images/icons/icon-192x192.png',
        badge: '/images/icons/icon-192x192.png',
        tag: payload.data?.tag || 'wedding-notification',
        data: payload.data,
        requireInteraction: payload.data?.urgent === 'true',
        vibrate: payload.data?.urgent === 'true' 
            ? [300, 100, 300, 100, 300] 
            : [200, 100, 200],
        actions: [
            {
                action: 'open',
                title: 'Abrir',
                icon: '/images/icons/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Fechar'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler para cliques na notificação
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notificação clicada:', event);
    
    event.notification.close();
    
    // Se o usuário clicou em "fechar", não faz nada
    if (event.action === 'close') {
        return;
    }
    
    const urlToOpen = event.notification.data?.url || '/index.html';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Tenta focar em uma janela já aberta
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Se não houver janela aberta, abre uma nova
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Log de instalação
self.addEventListener('install', (event) => {
    console.log('[SW] Service Worker instalado');
    self.skipWaiting();
});

// Log de ativação
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker ativado');
    event.waitUntil(clients.claim());
});