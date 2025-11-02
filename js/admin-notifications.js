// js/admin-notifications.js

import * as UI from './admin-ui.js';
import { db } from './firebase-service.js';

export class AdminNotificationManager {
    constructor() {
        this.scheduledNotifications = [];
    }

    // Renderiza a interface de controle no admin
    renderNotificationControl() {
        return `
        <div class="space-y-6">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">
                    <i class="fas fa-bell text-indigo-600 mr-2"></i>
                    Gerenciar Notificações
                </h2>

                <!-- Status das Notificações -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Total de Assinantes</p>
                                <p id="total-subscribers" class="text-2xl font-bold text-blue-600">-</p>
                            </div>
                            <i class="fas fa-users text-3xl text-blue-400"></i>
                        </div>
                    </div>
                    
                    <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Notificações Enviadas</p>
                                <p id="notifications-sent" class="text-2xl font-bold text-green-600">-</p>
                            </div>
                            <i class="fas fa-paper-plane text-3xl text-green-400"></i>
                        </div>
                    </div>
                    
                    <div class="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-600">Agendadas</p>
                                <p id="notifications-scheduled" class="text-2xl font-bold text-purple-600">-</p>
                            </div>
                            <i class="fas fa-clock text-3xl text-purple-400"></i>
                        </div>
                    </div>
                </div>

                <!-- Configurações de Notificações Automáticas -->
                <div class="border-t pt-6 mb-6">
                    <h3 class="text-xl font-semibold mb-4">Notificações Automáticas</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div class="flex-1">
                                <h4 class="font-medium">Lembrete 24h Antes</h4>
                                <p class="text-sm text-gray-600">Envia notificação 24 horas antes do casamento</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-24h-notification" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div class="flex-1">
                                <h4 class="font-medium">Lembrete 3h Antes</h4>
                                <p class="text-sm text-gray-600">Envia notificação 3 horas antes da cerimônia</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-3h-notification" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div class="flex-1">
                                <h4 class="font-medium">Notificações de Galeria</h4>
                                <p class="text-sm text-gray-600">Avisa quando alguém posta uma foto</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-gallery-notification" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div class="flex-1">
                                <h4 class="font-medium">Notificações de Mural</h4>
                                <p class="text-sm text-gray-600">Avisa quando alguém deixa uma mensagem</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="auto-guestbook-notification" class="sr-only peer" checked>
                                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                    <button id="save-notification-settings" class="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Salvar Configurações
                    </button>
                </div>

                <!-- Enviar Notificação Manual -->
                <div class="border-t pt-6">
                    <h3 class="text-xl font-semibold mb-4">Enviar Notificação Manual</h3>
                    <form id="manual-notification-form" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-2">Destinatários</label>
                            <select id="notification-recipients" class="w-full p-2 border rounded-lg">
                                <option value="all">Todos os Convidados</option>
                                <option value="restaurant">Apenas quem vai ao Restaurante</option>
                                <option value="ceremony">Apenas Cerimônia</option>
                                <option value="special">Padrinhos e Madrinhas</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-2">Título da Notificação</label>
                            <input type="text" id="notification-title" 
                                   class="w-full p-2 border rounded-lg" 
                                   placeholder="Ex: Lembrete Importante!"
                                   maxlength="50">
                            <p class="text-xs text-gray-500 mt-1">Máximo 50 caracteres</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-2">Mensagem</label>
                            <textarea id="notification-message" 
                                      class="w-full p-2 border rounded-lg" 
                                      rows="4"
                                      placeholder="Digite a mensagem da notificação..."
                                      maxlength="200"></textarea>
                            <p class="text-xs text-gray-500 mt-1">Máximo 200 caracteres</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium mb-2">Ícone</label>
                            <select id="notification-icon" class="w-full p-2 border rounded-lg">
                                <option value="🎉">🎉 Celebração</option>
                                <option value="⚠️">⚠️ Aviso</option>
                                <option value="💒">💒 Cerimônia</option>
                                <option value="🍽️">🍽️ Restaurante</option>
                                <option value="📸">📸 Foto</option>
                                <option value="💕">💕 Coração</option>
                                <option value="ℹ️">ℹ️ Informação</option>
                            </select>
                        </div>

                        <div class="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <input type="checkbox" id="notification-urgent" class="mr-3">
                            <div>
                                <label for="notification-urgent" class="font-medium cursor-pointer">
                                    Notificação Urgente
                                </label>
                                <p class="text-xs text-gray-600">Fará o celular vibrar e som de alerta</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <button type="button" id="preview-notification-btn" 
                                    class="py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                                <i class="fas fa-eye mr-2"></i>Prévia
                            </button>
                            <button type="submit" 
                                    class="py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                                <i class="fas fa-paper-plane mr-2"></i>Enviar Agora
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Histórico de Notificações -->
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-4">Histórico de Notificações</h3>
                <div id="notifications-history" class="space-y-3 max-h-96 overflow-y-auto">
                    <!-- Lista será preenchida dinamicamente -->
                </div>
            </div>

            <!-- Templates de Notificações -->
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold mb-4">Templates Rápidos</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button class="notification-template p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-all"
                            data-title="📍 Atualização de Local"
                            data-message="Atenção! Houve uma pequena mudança no local. Confira os detalhes atualizados no app."
                            data-recipients="all">
                        <h4 class="font-medium mb-1">📍 Mudança de Local</h4>
                        <p class="text-sm text-gray-600">Para avisar sobre alteração de endereço</p>
                    </button>

                    <button class="notification-template p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-all"
                            data-title="⏰ Horário Alterado"
                            data-message="O horário da cerimônia foi ajustado. Por favor, verifique o novo horário no app!"
                            data-recipients="all">
                        <h4 class="font-medium mb-1">⏰ Mudança de Horário</h4>
                        <p class="text-sm text-gray-600">Para avisar sobre alteração de horário</p>
                    </button>

                    <button class="notification-template p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-all"
                            data-title="📸 Compartilhe Fotos!"
                            data-message="Não esqueça de compartilhar suas fotos na galeria! Queremos guardar cada momento especial."
                            data-recipients="all">
                        <h4 class="font-medium mb-1">📸 Incentivo de Fotos</h4>
                        <p class="text-sm text-gray-600">Lembrar convidados de postar fotos</p>
                    </button>

                    <button class="notification-template p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left transition-all"
                            data-title="🍽️ Cardápio Especial"
                            data-message="Preparamos um menu incrível para vocês! Haverá opções vegetarianas e veganas."
                            data-recipients="restaurant">
                        <h4 class="font-medium mb-1">🍽️ Informação do Restaurante</h4>
                        <p class="text-sm text-gray-600">Detalhes sobre o jantar</p>
                    </button>
                </div>
            </div>
        </div>
        `;
    }

    // Salva configurações de notificações
    async saveNotificationSettings() {
        const settings = {
            auto24h: document.getElementById('auto-24h-notification').checked,
            auto3h: document.getElementById('auto-3h-notification').checked,
            autoGallery: document.getElementById('auto-gallery-notification').checked,
            autoGuestbook: document.getElementById('auto-guestbook-notification').checked,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('siteConfig').doc('notifications').set(settings, { merge: true });
            UI.showToast('Configurações salvas com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            UI.showToast('Erro ao salvar configurações.', 'error');
        }
    }

    // Carrega configurações
    async loadNotificationSettings() {
        try {
            const doc = await db.collection('siteConfig').doc('notifications').get();
            if (doc.exists) {
                const settings = doc.data();
                document.getElementById('auto-24h-notification').checked = settings.auto24h !== false;
                document.getElementById('auto-3h-notification').checked = settings.auto3h !== false;
                document.getElementById('auto-gallery-notification').checked = settings.autoGallery !== false;
                document.getElementById('auto-guestbook-notification').checked = settings.autoGuestbook !== false;
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    // Envia notificação manual
    async sendManualNotification(recipients, title, message, icon, urgent) {
        const notification = {
            recipients,
            title,
            message,
            icon,
            urgent: urgent || false,
            sentAt: firebase.firestore.FieldValue.serverTimestamp(),
            sentBy: firebase.auth().currentUser.email,
            type: 'manual'
        };

        try {
            await db.collection('notifications').add(notification);
            
            // Registra no histórico
            this.addToHistory(notification);
            
            UI.showToast(`Notificação enviada para ${this.getRecipientCount(recipients)} convidado(s)!`, 'success');
            
            // Limpa o formulário
            document.getElementById('manual-notification-form').reset();
            
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
            UI.showToast('Erro ao enviar notificação.', 'error');
        }
    }

    // Prévia da notificação
    showNotificationPreview(title, message, icon) {
        const previewHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                    <h3 class="text-lg font-semibold mb-4 text-center">Prévia da Notificação</h3>
                    
                    <!-- Simulação de notificação mobile -->
                    <div class="bg-gray-100 rounded-lg p-4 shadow-inner">
                        <div class="bg-white rounded-lg p-4 shadow-lg">
                            <div class="flex items-start">
                                <div class="text-3xl mr-3">${icon}</div>
                                <div class="flex-1">
                                    <div class="flex items-center justify-between mb-1">
                                        <span class="font-semibold text-sm">Nosso Casamento</span>
                                        <span class="text-xs text-gray-500">agora</span>
                                    </div>
                                    <h4 class="font-bold text-gray-900 mb-1">${title}</h4>
                                    <p class="text-sm text-gray-700">${message}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button id="close-preview" class="mt-6 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Fechar Prévia
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', previewHTML);
        document.getElementById('close-preview').addEventListener('click', () => {
            document.querySelector('.fixed.inset-0').remove();
        });
    }

    // Adiciona ao histórico
    addToHistory(notification) {
        const historyContainer = document.getElementById('notifications-history');
        const historyItem = `
            <div class="border rounded-lg p-4 hover:bg-gray-50">
                <div class="flex items-start justify-between">
                    <div class="flex items-start">
                        <span class="text-2xl mr-3">${notification.icon}</span>
                        <div>
                            <h4 class="font-medium">${notification.title}</h4>
                            <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
                            <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <span><i class="fas fa-user mr-1"></i>${this.getRecipientLabel(notification.recipients)}</span>
                                <span><i class="fas fa-clock mr-1"></i>Agora</span>
                                ${notification.urgent ? '<span class="text-red-500"><i class="fas fa-exclamation-triangle mr-1"></i>Urgente</span>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        historyContainer.insertAdjacentHTML('afterbegin', historyItem);
    }

    // Helpers
    getRecipientLabel(recipients) {
        const labels = {
            'all': 'Todos',
            'restaurant': 'Restaurante',
            'ceremony': 'Cerimônia',
            'special': 'Especiais'
        };
        return labels[recipients] || recipients;
    }

    getRecipientCount(recipients) {
        // Aqui você pode buscar do Firestore a quantidade real
        // Por enquanto, retorna estimativas
        const counts = {
            'all': 'todos os',
            'restaurant': 'X',
            'ceremony': 'Y',
            'special': 'Z'
        };
        return counts[recipients] || '?';
    }

    // Carrega histórico do Firestore
    async loadNotificationHistory() {
        const historyContainer = document.getElementById('notifications-history');
        
        db.collection('notifications')
            .orderBy('sentAt', 'desc')
            .limit(20)
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    historyContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Nenhuma notificação enviada ainda.</p>';
                    return;
                }

                historyContainer.innerHTML = '';
                snapshot.forEach(doc => {
                    const notification = doc.data();
                    const date = notification.sentAt ? notification.sentAt.toDate() : new Date();
                    
                    const historyItem = `
                        <div class="border rounded-lg p-4 hover:bg-gray-50">
                            <div class="flex items-start justify-between">
                                <div class="flex items-start">
                                    <span class="text-2xl mr-3">${notification.icon || '📬'}</span>
                                    <div>
                                        <h4 class="font-medium">${notification.title}</h4>
                                        <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
                                        <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                            <span><i class="fas fa-user mr-1"></i>${this.getRecipientLabel(notification.recipients)}</span>
                                            <span><i class="fas fa-clock mr-1"></i>${date.toLocaleString('pt-BR')}</span>
                                            ${notification.urgent ? '<span class="text-red-500"><i class="fas fa-exclamation-triangle mr-1"></i>Urgente</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    historyContainer.insertAdjacentHTML('beforeend', historyItem);
                });
            });
    }

    // Atualiza estatísticas
    async updateStats() {
        try {
            // Total de assinantes (usuários que aceitaram notificações)
            const usersSnapshot = await db.collection('users').get();
            document.getElementById('total-subscribers').textContent = usersSnapshot.size;

            // Notificações enviadas
            const notificationsSnapshot = await db.collection('notifications').get();
            document.getElementById('notifications-sent').textContent = notificationsSnapshot.size;

            // Agendadas (você pode implementar lógica específica)
            document.getElementById('notifications-scheduled').textContent = '2';

        } catch (error) {
            console.error('Erro ao atualizar estatísticas:', error);
        }
    }
}

// Exporta instância
export const adminNotificationManager = new AdminNotificationManager();