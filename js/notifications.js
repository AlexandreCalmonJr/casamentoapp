// js/notifications.js - VERSÃO CORRIGIDA COM FCM

import { auth, db } from './firebase-service.js';

class NotificationManager {
    constructor() {
        this.permission = 'default';
        this.messaging = null;
        this.currentToken = null;
        this.listener = null;
        
        // ⚠️ IMPORTANTE: Substitua pela sua chave VAPID gerada no Firebase Console
        this.vapidKey = 'COLE_SUA_CHAVE_VAPID_AQUI';
        
        this.initializeMessaging();
    }

    async initializeMessaging() {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            console.log('❌ Notificações não suportadas neste navegador');
            return;
        }

        try {
            // Aguarda o Service Worker estar pronto
            await navigator.serviceWorker.ready;
            
            // Inicializa o Firebase Messaging
            this.messaging = firebase.messaging();
            
            console.log('✅ Firebase Messaging inicializado');
            
            // Handler para mensagens em primeiro plano
            this.messaging.onMessage((payload) => {
                console.log('📬 Mensagem recebida (app ativo):', payload);
                this.showForegroundNotification(payload);
            });

        } catch (error) {
            console.error('❌ Erro ao inicializar Firebase Messaging:', error);
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
            console.log('❌ Notificações não disponíveis');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                console.log('✅ Permissão de notificação concedida');
                await this.getToken();
                return true;
            } else {
                console.log('❌ Permissão de notificação negada');
            }
            
            return false;
        } catch (error) {
            console.error('❌ Erro ao solicitar permissão:', error);
            return false;
        }
    }

    async getToken() {
        if (!this.messaging) {
            console.log('❌ Firebase Messaging não inicializado');
            return null;
        }

        // Verifica se a chave VAPID foi configurada
        if (this.vapidKey === 'BLEBkru5W_gAEqfJ_7j1TqUIdk4GvI8hIbD_oFu1M8Ni8Who7isVLORrgjK6RMJEX-019Xd6axDhwIbJvmlyitU') {
            console.error('❌ VAPID Key não configurada! Veja as instruções no código.');
            return null;
        }

        try {
            const token = await this.messaging.getToken({
                vapidKey: this.vapidKey
            });

            if (token) {
                console.log('✅ Token FCM obtido:', token.substring(0, 20) + '...');
                this.currentToken = token;
                
                // Salva o token no Firestore
                if (auth.currentUser) {
                    await this.saveTokenToFirestore(token);
                }
                
                return token;
            } else {
                console.log('❌ Não foi possível obter o token');
                return null;
            }
        } catch (error) {
            console.error('❌ Erro ao obter token FCM:', error);
            
            // Mensagens de erro comuns
            if (error.code === 'messaging/permission-blocked') {
                console.error('🚫 Permissão bloqueada. O usuário precisa ativar nas configurações do navegador.');
            } else if (error.code === 'messaging/notifications-blocked') {
                console.error('🚫 Notificações bloqueadas no navegador.');
            }
            
            return null;
        }
    }

    async saveTokenToFirestore(token) {
        if (!auth.currentUser) return;

        try {
            await db.collection('users').doc(auth.currentUser.uid).set({
                fcmToken: token,
                tokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                notificationsEnabled: true
            }, { merge: true });
            
            console.log('✅ Token FCM salvo no Firestore');
        } catch (error) {
            console.error('❌ Erro ao salvar token:', error);
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

    // Monitora notificações automáticas
    async checkAutoNotifications(weddingDetails, user, accessKeyInfo) {
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

        // Lembrete 24h antes
        if (hoursDiff > 23 && hoursDiff < 25 && config.auto24h !== false) {
            const lastNotified = localStorage.getItem(`reminder_24h_${user.uid}`);
            const today = new Date().toDateString();

            if (lastNotified !== today) {
                await this.createAutoNotification(
                    user.uid,
                    accessKeyInfo.data.willAttendRestaurant ? 'restaurant-24h' : 'ceremony-24h'
                );
                localStorage.setItem(`reminder_24h_${user.uid}`, today);
            }
        }

        // Lembrete 3h antes
        if (hoursDiff > 2.5 && hoursDiff < 3.5 && config.auto3h !== false) {
            const lastNotified = localStorage.getItem(`reminder_3h_${user.uid}`);
            const today = new Date().toDateString();

            if (lastNotified !== today) {
                await this.createAutoNotification(user.uid, 'wedding-day');
                localStorage.setItem(`reminder_3h_${user.uid}`, today);
            }
        }
    }

    async createAutoNotification(userId, type) {
        const templates = {
            'restaurant-24h': {
                title: '🍽️ Lembrete: Restaurante Amanhã!',
                body: 'Amanhã após a cerimônia teremos a recepção no restaurante. Estamos ansiosos!',
                icon: '🍽️'
            },
            'ceremony-24h': {
                title: '⛪ Lembrete: Cerimônia Amanhã!',
                body: 'A cerimônia será amanhã. Mal podemos esperar para vê-lo(a)!',
                icon: '⛪'
            },
            'wedding-day': {
                title: '💒 O Grande Dia Chegou!',
                body: 'A cerimônia começa em poucas horas! Até logo! 💕',
                icon: '💒'
            }
        };

        const template = templates[type];
        if (!template) return;

        // Busca o token do usuário
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        
        if (!userData?.fcmToken) {
            console.log('⚠️ Usuário não tem token FCM registrado');
            return;
        }

        // Adiciona à fila de notificações
        await db.collection('notificationQueue').add({
            token: userData.fcmToken,
            payload: {
                notification: {
                    title: template.title,
                    body: template.body,
                    icon: '/images/icons/icon-192x192.png'
                },
                data: {
                    type: type,
                    urgent: 'true',
                    url: '#rsvp'
                }
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            processed: false
        });

        console.log('✅ Notificação automática criada:', type);
    }

    startPeriodicCheck(weddingDetails, user, accessKeyInfo) {
        // Verifica a cada hora
        setInterval(() => {
            if (user && accessKeyInfo) {
                this.checkAutoNotifications(weddingDetails, user, accessKeyInfo);
            }
        }, 60 * 60 * 1000);

        // Verifica imediatamente
        if (user && accessKeyInfo) {
            this.checkAutoNotifications(weddingDetails, user, accessKeyInfo);
        }
    }

    async notifyNewPhoto(userName) {
        const configDoc = await db.collection('siteConfig').doc('notifications').get();
        const config = configDoc.exists ? configDoc.data() : {};
        
        if (config.autoGallery === false) return;

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

        console.log('✅ Notificação de nova foto criada');
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

        console.log('✅ Notificação de nova mensagem criada');
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
    if (!user) return;
    
    // Não pede novamente se já foi pedido
    if (localStorage.getItem('notification_requested')) {
        return;
    }
    
    // Aguarda 3 segundos após o login
    setTimeout(async () => {
        const granted = await notificationManager.requestPermission();
        if (granted) {
            localStorage.setItem('notification_requested', 'true');
            console.log('✅ Notificações configuradas com sucesso');
        }
    }, 3000);
}