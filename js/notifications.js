// js/notifications.js - VERSÃO CORRIGIDA COM FCM

import { auth, db } from './firebase-service.js';

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.messaging = null;
        this.currentToken = null;
        this.listener = null;
        this.initializeMessaging();
    }

    async initializeMessaging() {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            console.log('Notificações não suportadas neste navegador');
            return;
        }

        try {
            // Registra o Service Worker do Firebase Messaging
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker do Firebase registrado:', registration);

            // Inicializa o Firebase Messaging
            this.messaging = firebase.messaging();
            
            // Handler para mensagens recebidas quando o app está em primeiro plano
            this.messaging.onMessage((payload) => {
                console.log('Mensagem recebida (app ativo):', payload);
                this.showForegroundNotification(payload);
            });

        } catch (error) {
            console.error('Erro ao inicializar Firebase Messaging:', error);
        }
    }

    async checkPermission() {
        if (!('Notification' in window)) {
            return false;
        }
        this.permission = Notification.permission;
        return this.permission === 'granted';
    }

    async requestPermission() {
        if (!('Notification' in window) || !this.messaging) {
            console.log('Notificações não disponíveis');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                // Obtém o token FCM
                await this.getToken();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Erro ao solicitar permissão:', error);
            return false;
        }
    }

    async getToken() {
        if (!this.messaging) {
            console.log('Firebase Messaging não inicializado');
            return null;
        }

        try {
            // Obtém o token FCM
            const token = await this.messaging.getToken({
                vapidKey: 'BLEBkru5W_gAEqfJ_7j1TqUIdk4GvI8hIbD_oFu1M8Ni8Who7isVLORrgjK6RMJEX-019Xd6axDhwIbJvmlyitU' // IMPORTANTE: Você precisa gerar isso no Firebase Console
            });

            if (token) {
                console.log('Token FCM obtido:', token);
                this.currentToken = token;
                
                // Salva o token no Firestore associado ao usuário
                if (auth.currentUser) {
                    await this.saveTokenToFirestore(token);
                }
                
                return token;
            } else {
                console.log('Não foi possível obter o token');
                return null;
            }
        } catch (error) {
            console.error('Erro ao obter token FCM:', error);
            return null;
        }
    }

    async saveTokenToFirestore(token) {
        if (!auth.currentUser) return;

        try {
            await db.collection('users').doc(auth.currentUser.uid).set({
                fcmToken: token,
                tokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('Token FCM salvo no Firestore');
        } catch (error) {
            console.error('Erro ao salvar token:', error);
        }
    }

    // Mostra notificação quando o app está em primeiro plano
    showForegroundNotification(payload) {
        const title = payload.notification?.title || 'Nova Notificação';
        const options = {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-192x192.png',
            tag: payload.data?.tag || 'default',
            data: payload.data,
            requireInteraction: payload.data?.urgent === 'true',
            vibrate: payload.data?.urgent === 'true' ? [300, 100, 300, 100, 300] : [200, 100, 200]
        };

        if (Notification.permission === 'granted') {
            const notification = new Notification(title, options);
            
            notification.onclick = () => {
                window.focus();
                notification.close();
                
                if (payload.data?.url) {
                    window.location.href = payload.data.url;
                }
            };
        }
    }

    // ========= Escuta notificações do Firestore (mantido para compatibilidade) =========
    startListeningToNotifications(user, accessKeyInfo) {
        if (!user || !accessKeyInfo) return;

        if (this.listener) {
            this.listener();
        }

        this.listener = db.collection('notifications')
            .where('sentAt', '>', new Date())
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const notification = change.doc.data();
                        
                        // Verifica se deve receber
                        if (this.shouldReceiveNotification(notification, accessKeyInfo)) {
                            // Marca como enviada para este usuário
                            this.markAsReceived(change.doc.id, user.uid);
                        }
                    }
                });
            });
    }

    async markAsReceived(notificationId, userId) {
        try {
            await db.collection('notifications').doc(notificationId)
                .collection('recipients').doc(userId).set({
                    receivedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    opened: false
                });
        } catch (error) {
            console.error('Erro ao marcar notificação como recebida:', error);
        }
    }

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

    async checkRestaurantReminder(weddingDetails, user, accessKeyInfo) {
        if (!accessKeyInfo?.data) return;

        const configDoc = await db.collection('siteConfig').doc('notifications').get();
        const config = configDoc.exists ? configDoc.data() : {};
        
        if (config.auto24h === false && config.auto3h === false) {
            return;
        }

        const now = new Date();
        const weddingDate = weddingDetails.weddingDate;
        const timeDiff = weddingDate - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        if (hoursDiff > 24 && hoursDiff < 25 && config.auto24h !== false) {
            const lastNotified = localStorage.getItem(`restaurant_notified_${user.uid}`);
            const today = new Date().toDateString();

            if (lastNotified !== today) {
                // Cria notificação no Firestore para ser enviada via FCM
                await this.createAutoNotification(
                    user.uid,
                    accessKeyInfo.data.willAttendRestaurant ? 'restaurant-24h' : 'ceremony-24h',
                    accessKeyInfo.data
                );
                localStorage.setItem(`restaurant_notified_${user.uid}`, today);
            }
        }

        if (hoursDiff > 3 && hoursDiff < 4 && config.auto3h !== false) {
            const lastNotified = localStorage.getItem(`wedding_day_notified_${user.uid}`);
            const today = new Date().toDateString();

            if (lastNotified !== today) {
                await this.createAutoNotification(
                    user.uid,
                    'wedding-day',
                    accessKeyInfo.data
                );
                localStorage.setItem(`wedding_day_notified_${user.uid}`, today);
            }
        }
    }

    async createAutoNotification(userId, type, keyData) {
        const templates = {
            'restaurant-24h': {
                title: '🍽️ Lembrete: Restaurante Amanhã!',
                body: `Olá ${keyData.guestName}! Lembre-se que amanhã após a cerimônia teremos a recepção no restaurante. Estamos ansiosos!`
            },
            'ceremony-24h': {
                title: '⛪ Lembrete: Cerimônia Amanhã!',
                body: `Olá ${keyData.guestName}! A cerimônia será amanhã. Mal podemos esperar para vê-lo(a)!`
            },
            'wedding-day': {
                title: '💒 O Grande Dia Chegou!',
                body: 'A cerimônia começa em poucas horas! Até logo! 💕'
            }
        };

        const template = templates[type];
        if (!template) return;

        // Salva no Firestore para o Cloud Function enviar via FCM
        await db.collection('notificationQueue').add({
            userId: userId,
            title: template.title,
            body: template.body,
            icon: '💍',
            urgent: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            sent: false
        });
    }

    startPeriodicCheck(weddingDetails, user, accessKeyInfo) {
        setInterval(() => {
            if (user && accessKeyInfo) {
                this.checkRestaurantReminder(weddingDetails, user, accessKeyInfo);
            }
        }, 60 * 60 * 1000);

        if (user && accessKeyInfo) {
            this.checkRestaurantReminder(weddingDetails, user, accessKeyInfo);
        }

        this.startListeningToNotifications(user, accessKeyInfo);
    }

    async notifyNewPhoto(userName) {
        const configDoc = await db.collection('siteConfig').doc('notifications').get();
        const config = configDoc.exists ? configDoc.data() : {};
        
        if (config.autoGallery === false) return;

        // Cria notificação para todos os outros usuários
        await db.collection('notifications').add({
            recipients: 'all',
            title: '📸 Nova Foto na Galeria!',
            message: `${userName} acabou de compartilhar uma foto. Confira!`,
            icon: '📸',
            urgent: false,
            sentAt: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'auto-gallery',
            data: {
                url: '#guest-photos'
            }
        });
    }

    async notifyNewMessage(userName) {
        const configDoc = await db.collection('siteConfig').doc('notifications').get();
        const config = configDoc.exists ? configDoc.data() : {};
        
        if (config.autoGuestbook === false) return;

        await db.collection('notifications').add({
            recipients: 'all',
            title: '💌 Nova Mensagem no Mural!',
            message: `${userName} deixou uma mensagem carinhosa. Veja o que escreveu!`,
            icon: '💌',
            urgent: false,
            sentAt: firebase.firestore.FieldValue.serverTimestamp(),
            type: 'auto-guestbook',
            data: {
                url: '#guestbook'
            }
        });
    }

    stopListening() {
        if (this.listener) {
            this.listener();
            this.listener = null;
        }
    }
}

export const notificationManager = new NotificationManager();

export async function requestNotificationPermissionOnLogin(user) {
    if (user && !localStorage.getItem('notification_requested')) {
        setTimeout(async () => {
            const granted = await notificationManager.requestPermission();
            if (granted) {
                localStorage.setItem('notification_requested', 'true');
            }
        }, 3000);
    }
}