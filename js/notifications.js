// js/notifications.js - VERSÃO APRIMORADA

import { db } from './firebase-service.js';

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.listener = null;
        this.checkPermission();
    }

    async checkPermission() {
        if (!('Notification' in window)) {
            console.log('Este navegador não suporta notificações');
            return false;
        }
        this.permission = Notification.permission;
        return this.permission === 'granted';
    }

    async requestPermission() {
        if (!('Notification' in window)) {
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        const permission = await Notification.requestPermission();
        this.permission = permission;
        return permission === 'granted';
    }

    async sendNotification(title, options = {}) {
        const hasPermission = await this.checkPermission();
        
        if (!hasPermission) {
            console.log('Permissão de notificação não concedida');
            return;
        }

        // Configurações padrão
        const defaultOptions = {
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'wedding-notification',
            renotify: true,
            requireInteraction: false,
            silent: false,
            ...options
        };

        const notification = new Notification(title, defaultOptions);

        notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Navega para a página relevante se especificado
            if (options.url) {
                window.location.href = options.url;
            }
        };

        return notification;
    }

    // ========= NOVO: Escuta notificações do Firestore =========
    startListeningToNotifications(user, accessKeyInfo) {
        if (!user || !accessKeyInfo) return;

        // Para de escutar notificações antigas se houver
        if (this.listener) {
            this.listener();
        }

        // Escuta novas notificações em tempo real
        this.listener = db.collection('notifications')
            .where('sentAt', '>', new Date())
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const notification = change.doc.data();
                        this.processNotification(notification, user, accessKeyInfo);
                    }
                });
            });
    }

    // Processa notificação recebida do admin
    async processNotification(notification, user, accessKeyInfo) {
        // Verifica se o usuário deve receber esta notificação
        if (!this.shouldReceiveNotification(notification, accessKeyInfo)) {
            return;
        }

        // Monta as opções da notificação
        const options = {
            body: notification.message,
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-192x192.png',
            vibrate: notification.urgent ? [300, 100, 300, 100, 300] : [200, 100, 200],
            requireInteraction: notification.urgent,
            tag: `notification-${notification.recipients}`,
            data: {
                url: notification.url || '#rsvp'
            }
        };

        // Adiciona o ícone emoji se houver
        if (notification.icon) {
            options.body = `${notification.icon} ${options.body}`;
        }

        await this.sendNotification(notification.title, options);
    }

    // Verifica se o usuário deve receber a notificação baseado no filtro
    shouldReceiveNotification(notification, accessKeyInfo) {
        const recipients = notification.recipients;
        
        switch (recipients) {
            case 'all':
                return true;
            
            case 'restaurant':
                return accessKeyInfo.data.willAttendRestaurant === true;
            
            case 'ceremony':
                return accessKeyInfo.data.willAttendRestaurant === false;
            
            case 'special':
                const specialRoles = ['Padrinho', 'Madrinha', 'Amigo do Noivo', 'Amiga da Noiva'];
                return specialRoles.includes(accessKeyInfo.data.role);
            
            default:
                return true;
        }
    }

    // Verifica se deve notificar sobre o restaurante
    async checkRestaurantReminder(weddingDetails, user, accessKeyInfo) {
        if (!accessKeyInfo?.data) return;

        // Verifica configurações do admin
        const configDoc = await db.collection('siteConfig').doc('notifications').get();
        const config = configDoc.exists ? configDoc.data() : {};
        
        if (config.auto24h === false && config.auto3h === false) {
            return; // Notificações automáticas desabilitadas
        }

        const now = new Date();
        const weddingDate = weddingDetails.weddingDate;
        const timeDiff = weddingDate - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // Se faltam entre 24 e 25 horas
        if (hoursDiff > 24 && hoursDiff < 25 && config.auto24h !== false) {
            const lastNotified = localStorage.getItem(`restaurant_notified_${user.uid}`);
            const today = new Date().toDateString();

            if (lastNotified !== today) {
                if (accessKeyInfo.data.willAttendRestaurant) {
                    await this.sendNotification(
                        '🍽️ Lembrete: Restaurante Amanhã!',
                        {
                            body: `Olá ${accessKeyInfo.data.guestName}! Lembre-se que amanhã após a cerimônia teremos a recepção no ${weddingDetails.restaurantName}. Estamos ansiosos!`,
                            tag: 'restaurant-reminder',
                            requireInteraction: true,
                            vibrate: [300, 100, 300],
                            data: { url: '#details' }
                        }
                    );
                } else {
                    await this.sendNotification(
                        '⛪ Lembrete: Cerimônia Amanhã!',
                        {
                            body: `Olá ${accessKeyInfo.data.guestName}! A cerimônia será amanhã às ${weddingDetails.weddingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h. Mal podemos esperar para vê-lo(a)!`,
                            tag: 'ceremony-reminder',
                            requireInteraction: true,
                            vibrate: [300, 100, 300],
                            data: { url: '#details' }
                        }
                    );
                }
                localStorage.setItem(`restaurant_notified_${user.uid}`, today);
            }
        }

        // Notificação no dia do casamento (3 horas antes)
        if (hoursDiff > 3 && hoursDiff < 4 && config.auto3h !== false) {
            const lastNotified = localStorage.getItem(`wedding_day_notified_${user.uid}`);
            const today = new Date().toDateString();

            if (lastNotified !== today) {
                await this.sendNotification(
                    '💒 O Grande Dia Chegou!',
                    {
                        body: `A cerimônia começa em poucas horas! Até logo em ${weddingDetails.venue}! 💕`,
                        tag: 'wedding-day',
                        requireInteraction: true,
                        vibrate: [500, 200, 500, 200, 500],
                        data: { url: '#rsvp' }
                    }
                );
                localStorage.setItem(`wedding_day_notified_${user.uid}`, today);
            }
        }
    }

    // Verifica notificações periodicamente
    startPeriodicCheck(weddingDetails, user, accessKeyInfo) {
        // Verifica a cada hora
        setInterval(() => {
            if (user && accessKeyInfo) {
                this.checkRestaurantReminder(weddingDetails, user, accessKeyInfo);
            }
        }, 60 * 60 * 1000);

        // Verifica imediatamente também
        if (user && accessKeyInfo) {
            this.checkRestaurantReminder(weddingDetails, user, accessKeyInfo);
        }

        // Inicia escuta de notificações do admin
        this.startListeningToNotifications(user, accessKeyInfo);
    }

    // Notifica sobre nova foto na galeria
    async notifyNewPhoto(userName) {
        // Verifica configurações
        const configDoc = await db.collection('siteConfig').doc('notifications').get();
        const config = configDoc.exists ? configDoc.data() : {};
        
        if (config.autoGallery === false) return;

        await this.sendNotification(
            '📸 Nova Foto na Galeria!',
            {
                body: `${userName} acabou de compartilhar uma foto. Confira!`,
                tag: 'new-photo',
                data: { url: '#guest-photos' }
            }
        );
    }

    // Notifica sobre nova mensagem no mural
    async notifyNewMessage(userName) {
        // Verifica configurações
        const configDoc = await db.collection('siteConfig').doc('notifications').get();
        const config = configDoc.exists ? configDoc.data() : {};
        
        if (config.autoGuestbook === false) return;

        await this.sendNotification(
            '💌 Nova Mensagem no Mural!',
            {
                body: `${userName} deixou uma mensagem carinhosa. Veja o que escreveu!`,
                tag: 'new-message',
                data: { url: '#guestbook' }
            }
        );
    }

    // Para de escutar notificações (quando faz logout)
    stopListening() {
        if (this.listener) {
            this.listener();
            this.listener = null;
        }
    }
}

export const notificationManager = new NotificationManager();

// Solicitar permissão quando o usuário fizer login
export async function requestNotificationPermissionOnLogin(user) {
    if (user && !localStorage.getItem('notification_requested')) {
        // Espera um pouco para não ser intrusivo
        setTimeout(async () => {
            const granted = await notificationManager.requestPermission();
            if (granted) {
                localStorage.setItem('notification_requested', 'true');
                await notificationManager.sendNotification(
                    '🔔 Notificações Ativadas!',
                    {
                        body: 'Você receberá lembretes importantes sobre o casamento.',
                        tag: 'welcome-notification'
                    }
                );
            }
        }, 3000);
    }
}