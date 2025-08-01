// js/admin-ui.js

// --- Funções de Ajuda e Otimização ---

/**
 * Otimiza uma URL do Cloudinary para uma thumbnail.
 * @param {string} url - A URL original.
 * @returns {string} A URL otimizada.
 */
function getOptimizedCloudinaryUrl(url) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/EEE/31343C?text=Foto';
    }
    return url.replace('/image/upload/', '/image/upload/w_400,h_400,c_fill,q_auto/');
}

/**
 * Ativa/desativa o estado de carregamento de um botão.
 * @param {HTMLElement} button - O elemento do botão.
 * @param {boolean} isLoading - Se deve mostrar o estado de carregamento.
 */
export function setButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.innerHTML;
        }
        button.innerHTML = `<div class="btn-spinner mx-auto" style="border-top-color: white;"></div>`;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

/**
 * Mostra um modal de confirmação e retorna uma Promise.
 * @param {Object} options - Opções para o modal { title, message, confirmText, isDestructive }.
 * @returns {Promise<boolean>} - Resolve com true se confirmado, false se cancelado.
 */
export function showConfirmationModal({ title = 'Confirmar Ação', message = 'Você tem certeza?', confirmText = 'Confirmar', isDestructive = true }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmation-modal');
        const titleEl = document.getElementById('confirmation-title');
        const messageEl = document.getElementById('confirmation-message');
        const confirmBtn = document.getElementById('confirm-action-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        titleEl.textContent = title;
        messageEl.textContent = message;
        confirmBtn.textContent = confirmText;

        confirmBtn.className = 'py-2 px-6 rounded-lg text-white transition-colors';
        if (isDestructive) {
            confirmBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        } else {
            confirmBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }

        modal.classList.remove('hidden');

        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}


// --- Funções de Renderização do Layout do Dashboard ---

/**
 * Renderiza um spinner de carregamento para a área de conteúdo.
 * @returns {string} HTML do spinner.
 */
export function renderLoadingSpinner() {
    return `<div class="flex justify-center items-center p-20">
                <i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
            </div>`;
}

/**
 * Gera os links de navegação para a barra lateral.
 * @returns {string} HTML dos links da navegação.
 */
export function renderSidebarNav() {
    const navItems = [
        { tab: 'report', icon: 'fa-chart-pie', label: 'Relatório' },
        { tab: 'keys', icon: 'fa-key', label: 'Convites' },
        { tab: 'guestbook', icon: 'fa-book-open', label: 'Recados' },
        { tab: 'gifts', icon: 'fa-gift', label: 'Presentes' },
        { tab: 'admin-gallery', icon: 'fa-images', label: 'Galeria' },
        { tab: 'details', icon: 'fa-cogs', label: 'Configurações' },
    ];

    return navItems.map(item => `
        <a href="#" data-tab="${item.tab}" class="sidebar-link flex items-center py-3 px-4 my-1 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-all">
            <i class="fas ${item.icon} w-6 text-center"></i>
            <span class="ml-3">${item.label}</span>
        </a>
    `).join('');
}

/**
 * Define o link ativo na barra lateral.
 * @param {string} tabName - O nome da aba/link a ser ativado.
 */
export function setActiveSidebarLink(tabName) {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const isSelected = link.dataset.tab === tabName;
        link.classList.toggle('bg-indigo-600', isSelected);
        link.classList.toggle('text-white', isSelected);
        link.classList.toggle('text-gray-300', !isSelected);
    });
}


// --- Funções de Renderização de Conteúdo das Abas ---

export function renderDetailsEditor(details) {
    const weddingDate = new Date(details.weddingDate.toDate()).toISOString().slice(0, 16);
    const rsvpDate = new Date(details.rsvpDate.toDate()).toISOString().slice(0, 10);

    return `
        <div class="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto space-y-6">
            <h2 class="text-2xl font-bold text-gray-800 border-b pb-2">Configurações Gerais</h2>
            
            <!-- Detalhes da Cerimônia -->
            <div>
                <h3 class="text-xl font-bold mb-4">Detalhes da Cerimônia</h3>
                <form id="details-form" class="space-y-4">
                    <!-- Campos existentes... -->
                    <div><label class="block text-sm font-medium">Nomes do Casal</label><input type="text" id="form-couple-names" value="${details.coupleNames || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Data e Hora</label><input type="datetime-local" id="form-wedding-date" value="${weddingDate}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Data Limite para RSVP</label><input type="date" id="form-rsvp-date" value="${rsvpDate}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Local da Cerimônia</label><input type="text" id="form-venue" value="${details.venue || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Dress Code</label><input type="text" id="form-dress-code" value="${details.dressCode || ''}" class="w-full mt-1 p-2 border rounded"></div>
                </form>
            </div>

            <!-- Detalhes do Restaurante -->
            <div class="border-t pt-6">
                <h3 class="text-xl font-bold mb-4">Detalhes do Restaurante</h3>
                <form id="restaurant-form" class="space-y-4">
                    <!-- Campos existentes... -->
                    <div><label class="block text-sm font-medium">Nome do Restaurante</label><input type="text" id="form-restaurant-name" value="${details.restaurantName || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Endereço do Restaurante</label><input type="text" id="form-restaurant-address" value="${details.restaurantAddress || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Informação de Valor</label><input type="text" id="form-restaurant-price" value="${details.restaurantPriceInfo || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Link do Google Maps</label><input type="url" id="form-restaurant-mapslink" value="${details.restaurantMapsLink || ''}" class="w-full mt-1 p-2 border rounded"></div>
                </form>
            </div>
            
            <!-- MELHORIA: Seção de Pagamento PIX -->
            <div class="border-t pt-6">
                <h3 class="text-xl font-bold mb-4">Configuração de Presentes (PIX)</h3>
                <form id="pix-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium">Sua Chave PIX</label>
                        <input type="text" id="form-pix-key" value="${details.pixKey || ''}" class="w-full mt-1 p-2 border rounded" placeholder="CPF, e-mail, telefone ou chave aleatória">
                        <p class="text-xs text-gray-500 mt-1">Esta chave será usada para gerar os QR Codes para os presentes.</p>
                    </div>
                </form>
            </div>

            <button id="save-all-details-button" class="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700">Salvar Todas as Alterações</button>
            <p id="details-success" class="text-green-600 text-sm text-center hidden">Detalhes salvos com sucesso!</p>
        </div>`;
}

export function renderKeyManager() {
    return `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Gerenciador de Convites</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-bold mb-4">Gerar Novo Convite</h3>
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium">Nome do Convidado (ou Família)</label><input type="text" id="guest-name" class="w-full mt-1 p-2 border rounded" placeholder="Ex: Família Silva"></div>
                    <div><label class="block text-sm font-medium">Telefone (com DDI e DDD)</label><input type="tel" id="guest-phone" class="w-full mt-1 p-2 border rounded" placeholder="Ex: 5571999998888"></div>
                    <div>
                        <label class="block text-sm font-medium">Tipo de Convite</label>
                        <select id="invite-type" class="w-full mt-1 p-2 border rounded bg-white">
                            <option value="individual">Individual</option>
                            <option value="family">Família</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium">Número de Pessoas</label>
                        <input type="number" id="allowed-guests" value="1" min="1" class="w-full mt-1 p-2 border rounded">
                    </div>
                    <button id="generate-key-button" class="w-full py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700">Gerar Convite</button>
                </div>
            </div>
            <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-bold mb-4">Convites Gerados</h3>
                <div id="keys-list" class="max-h-[60vh] overflow-y-auto custom-scrollbar"></div>
            </div>
        </div>`;
}

export function renderGuestsReport() {
    return `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Relatório de Convidados</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                 <h3 class="text-lg font-bold text-gray-600 mb-2">Pessoas Confirmadas</h3>
                 <p id="total-guests-count" class="text-5xl font-bold text-indigo-600"><i class="fas fa-spinner fa-spin"></i></p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                 <h3 class="text-lg font-bold text-gray-600 mb-2">Irão ao Restaurante</h3>
                 <p id="restaurant-guests-count" class="text-5xl font-bold text-green-600"><i class="fas fa-spinner fa-spin"></i></p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                 <h3 class="text-lg font-bold text-gray-600 mb-2">Apenas Cerimônia</h3>
                 <p id="ceremony-only-count" class="text-5xl font-bold text-blue-500"><i class="fas fa-spinner fa-spin"></i></p>
            </div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="flex flex-col md:flex-row justify-between md:items-center mb-4">
                <h3 class="text-xl font-bold">Lista de Confirmações</h3>
                <button id="export-csv-button" class="mt-4 md:mt-0 w-full md:w-auto py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center">
                    <i class="fas fa-file-csv mr-2"></i>Exportar para CSV
                </button>
            </div>
            <div id="guests-report-list" class="max-h-[50vh] overflow-y-auto custom-scrollbar"></div>
        </div>`;
}

export function renderGuestbookAdmin() {
    return `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Moderar Mural de Recados</h2>
            <div id="messages-list" class="space-y-4"></div>
        </div>`;
}

export function renderGiftsManager() {
    return `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Gerenciar Lista de Presentes</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-bold mb-4">Adicionar Novo Presente</h3>
                <form id="add-gift-form" class="space-y-4">
                    <div><label class="block text-sm font-medium">Nome do Presente</label><input type="text" id="gift-name" class="w-full mt-1 p-2 border rounded" required></div>
                    
                    <!-- MELHORIA: Campo de Valor para o PIX -->
                    <div>
                        <label class="block text-sm font-medium">Valor (R$)</label>
                        <input type="number" id="gift-price" class="w-full mt-1 p-2 border rounded" placeholder="Ex: 150.00" step="0.01" min="0" required>
                    </div>

                    <div><label class="block text-sm font-medium">URL da Imagem (opcional)</label><input type="url" id="gift-image-url" class="w-full mt-1 p-2 border rounded" placeholder="https://..."></div>
                    <div><label class="block text-sm font-medium">Descrição (opcional)</label><textarea id="gift-description" class="w-full mt-1 p-2 border rounded" rows="3"></textarea></div>
                    <button type="submit" class="w-full py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700">Adicionar à Lista</button>
                </form>
            </div>
            <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-bold mb-4">Lista de Presentes Cadastrados</h3>
                <div id="gifts-list-admin" class="max-h-[60vh] overflow-y-auto custom-scrollbar"></div>
            </div>
        </div>`;
}

export function renderAdminGallery() {
    return `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">Moderar Galeria de Convidados</h2>
            <div id="admin-gallery-container" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            </div>
        </div>`;
}


// --- Funções de Atualização de Listas ---

export function updateKeysList(keys) {
    const listEl = document.getElementById('keys-list');
    if (!listEl) return;
    if (keys.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhuma chave gerada.</p>`;
        return;
    }
    listEl.innerHTML = keys.map(key => {
        const usedClass = key.isUsed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        const usedText = key.isUsed ? `Sim` : 'Não';
        const peopleText = key.allowedGuests > 1 ? `${key.allowedGuests} pessoas` : `${key.allowedGuests} pessoa`;
        return `
            <div class="p-3 border-b flex justify-between items-center hover:bg-gray-50">
                <div>
                    <p class="font-semibold">${key.guestName} <span class="text-xs font-normal text-gray-500">(${peopleText})</span></p>
                    <p class="text-sm font-mono text-gray-600">${key.id}</p> ${key.isUsed ? `<p class="text-xs text-gray-500">Usado por: ${key.usedByEmail}</p>` : ''}
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-xs font-medium px-2 py-1 rounded-full ${usedClass}">Utilizado: ${usedText}</span>
                    <button data-key='${JSON.stringify(key)}' class="share-key-btn text-gray-400 hover:text-green-600" title="Compartilhar Convite" aria-label="Compartilhar Convite"><i class="fas fa-share-alt"></i></button>
                    <button data-id="${key.id}" class="edit-key-btn text-gray-400 hover:text-blue-600" title="Editar" aria-label="Editar Convite"><i class="fas fa-edit"></i></button>
                    <button data-id="${key.id}" class="delete-key-btn text-gray-400 hover:text-red-600" title="Excluir" aria-label="Excluir Convite"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    }).join('');
}

export function updateGuestsReport(usedKeys) {
    const listEl = document.getElementById('guests-report-list');
    const totalCountEl = document.getElementById('total-guests-count');
    const restaurantCountEl = document.getElementById('restaurant-guests-count');
    const ceremonyOnlyCountEl = document.getElementById('ceremony-only-count');
    if (!listEl || !totalCountEl || !restaurantCountEl) return;
    
    let totalGuests = 0;
    let restaurantGuests = 0;

    if (usedKeys.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhum convidado se cadastrou ainda.</p>`;
        totalCountEl.textContent = '0';
        restaurantCountEl.textContent = '0';
        ceremonyOnlyCountEl.textContent = '0';
        return;
    }
    
    listEl.innerHTML = usedKeys.map(key => {
        totalGuests += key.allowedGuests || 1;
        if (key.willAttendRestaurant) {
            restaurantGuests += key.allowedGuests || 1;
        }
        const usedDate = key.usedAt ? key.usedAt.toDate().toLocaleString('pt-BR') : 'N/A';
        const peopleText = key.allowedGuests > 1 ? `${key.allowedGuests} pessoas` : `${key.allowedGuests} pessoa`;
        const restaurantIcon = key.willAttendRestaurant 
            ? `<i class="fas fa-utensils text-green-500" title="Irá ao restaurante"></i>` 
            : `<i class="fas fa-church text-gray-400" title="Apenas cerimônia"></i>`;

        return `<div class="p-3 border-b hover:bg-gray-50">
                    <div class="flex justify-between items-start cursor-pointer report-item" data-id="${key.id}">
                        <div>
                            <p class="font-semibold">${key.guestName}</p>
                            <p class="text-sm text-gray-600">${key.usedByEmail}</p>
                        </div>
                        <div class="flex items-center space-x-3">
                            <span class="text-sm font-bold text-gray-700">${peopleText}</span>
                            ${restaurantIcon}
                        </div>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">Cadastrado em: ${usedDate}</p>
                    <div id="guest-names-list-${key.id}" class="hidden mt-2 pl-4 border-l-2 border-gray-200">
                        <p class="text-xs text-gray-500">Carregando nomes...</p>
                    </div>
                </div>`;
    }).join('');
    totalCountEl.textContent = totalGuests;
    restaurantCountEl.textContent = restaurantGuests;
    ceremonyOnlyCountEl.textContent = totalGuests - restaurantGuests;
}

export function updateGuestbookAdminList(messages) {
    const listEl = document.getElementById('messages-list');
    if (!listEl) return;
    if (messages.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhuma mensagem no mural.</p>`;
        return;
    }
    listEl.innerHTML = messages.map(msg => `
        <div class="p-3 border rounded-md flex justify-between items-start hover:bg-gray-50">
            <div>
                <p class="text-sm">${msg.message}</p>
                <p class="text-xs text-gray-500 mt-1">- ${msg.userName}</p>
            </div>
            <button data-id="${msg.id}" class="delete-message-btn text-red-400 hover:text-red-600 flex-shrink-0 ml-4" aria-label="Excluir mensagem"><i class="fas fa-trash"></i></button>
        </div>`
    ).join('');
}

export function updateGiftsAdminList(gifts) {
    const listEl = document.getElementById('gifts-list-admin');
    if (!listEl) return;
    if (gifts.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhum presente adicionado.</p>`;
        return;
    }
    listEl.innerHTML = gifts.map(gift => {
        const takenClass = gift.isTaken ? 'bg-green-100' : '';
        const optimizedImageUrl = getOptimizedCloudinaryUrl(gift.imageUrl);
        // MELHORIA: Formata o preço para exibição
        const formattedPrice = gift.price ? `R$ ${Number(gift.price).toFixed(2).replace('.', ',')}` : 'Valor não definido';

        return `
            <div class="p-3 border-b flex justify-between items-center hover:bg-gray-50 ${takenClass}">
                <div class="flex items-center">
                    <img src="${optimizedImageUrl}" alt="${gift.name}" class="w-12 h-12 object-cover rounded-md mr-4">
                    <div>
                        <p class="font-semibold">${gift.name}</p>
                        <p class="text-sm font-bold text-indigo-600">${formattedPrice}</p>
                        ${gift.isTaken ? `<p class="text-xs text-green-700">Escolhido por: ${gift.takenBy}</p>` : ''}
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button data-id="${gift.id}" class="edit-gift-btn text-gray-400 hover:text-blue-600" aria-label="Editar presente"><i class="fas fa-edit"></i></button>
                    <button data-id="${gift.id}" class="delete-gift-btn text-gray-400 hover:text-red-600" aria-label="Excluir presente"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    }).join('');
}

export function updateAdminGallery(photos) {
    const container = document.getElementById('admin-gallery-container');
    if (!container) return;
    if (photos.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-500">Nenhuma foto foi enviada pelos convidados ainda.</p>`;
        return;
    }
    container.innerHTML = photos.map(photo => {
        const optimizedImageUrl = getOptimizedCloudinaryUrl(photo.imageUrl);
        return `
        <div class="relative group">
            <img src="${optimizedImageUrl}" alt="Foto de ${photo.userName}" class="w-full h-full object-cover rounded-lg shadow-md">
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex flex-col items-center justify-center text-white p-2 rounded-lg">
                <p class="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-center">Enviada por:<br><strong>${photo.userName}</strong></p>
                <button data-id="${photo.id}" class="delete-photo-btn mt-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xl" aria-label="Excluir foto"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `;
    }).join('');
}
