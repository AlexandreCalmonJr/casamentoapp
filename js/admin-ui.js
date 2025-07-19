// js/admin-ui.js

/**
 * Gera o HTML para a aba de edição de detalhes.
 * @param {Object} details - Os detalhes do casamento vindos do Firestore.
 * @returns {string} O HTML do formulário.
 */
export function renderDetailsEditor(details) {
    const weddingDate = new Date(details.weddingDate.toDate()).toISOString().slice(0, 16);
    const rsvpDate = new Date(details.rsvpDate.toDate()).toISOString().slice(0, 10);

    return `
        <div class="bg-white p-6 rounded-lg shadow-md max-w-2xl mx-auto">
            <h2 class="text-xl font-bold mb-4">Editar Detalhes do Casamento</h2>
            <form id="details-form" class="space-y-4">
                <div><label class="block text-sm font-medium">Nomes do Casal</label><input type="text" id="form-couple-names" value="${details.coupleNames}" class="w-full mt-1 p-2 border rounded"></div>
                <div><label class="block text-sm font-medium">Data e Hora</label><input type="datetime-local" id="form-wedding-date" value="${weddingDate}" class="w-full mt-1 p-2 border rounded"></div>
                <div><label class="block text-sm font-medium">Data Limite para RSVP</label><input type="date" id="form-rsvp-date" value="${rsvpDate}" class="w-full mt-1 p-2 border rounded"></div>
                <div><label class="block text-sm font-medium">Local</label><input type="text" id="form-venue" value="${details.venue}" class="w-full mt-1 p-2 border rounded"></div>
                <div><label class="block text-sm font-medium">Dress Code</label><input type="text" id="form-dress-code" value="${details.dressCode}" class="w-full mt-1 p-2 border rounded"></div>
                <button type="submit" class="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700">Salvar Alterações</button>
                <p id="details-success" class="text-green-600 text-sm text-center hidden">Detalhes salvos com sucesso!</p>
            </form>
        </div>`;
}

/**
 * Gera o HTML para a aba de gerenciamento de convites.
 * @returns {string} O HTML da aba.
 */
export function renderKeyManager() {
    return `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-bold mb-4">Gerar Novo Convite</h2>
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium">Nome do Convidado (ou Família)</label><input type="text" id="guest-name" class="w-full mt-1 p-2 border rounded" placeholder="Ex: Família Silva"></div>
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
                    <button id="generate-key-button" class="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">Gerar Chave</button>
                </div>
                <div id="key-result" class="mt-4 p-3 bg-gray-50 rounded hidden"></div>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-bold mb-4">Convites Gerados</h2>
                <div id="keys-list" class="max-h-96 overflow-y-auto"></div>
            </div>
        </div>`;
}

/**
 * Gera o HTML para a aba de relatório de convidados.
 * @returns {string} O HTML da aba.
 */
export function renderGuestsReport() {
    return `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="mb-6 text-center">
                <h2 class="text-xl font-bold mb-2">Total de Convidados Confirmados</h2>
                <p id="total-guests-count" class="text-5xl font-bold text-blue-600"><i class="fas fa-spinner fa-spin"></i></p>
                <p class="text-sm text-gray-500">Soma de todas as pessoas dos convites utilizados</p>
            </div>
            <h2 class="text-xl font-bold mb-4 border-t pt-6">Relatório de Convidados Cadastrados</h2>
            <div id="guests-report-list"></div>
        </div>`;
}

/**
 * Gera o HTML para a aba de moderação do mural de recados.
 * @returns {string} O HTML da aba.
 */
export function renderGuestbookAdmin() {
    return `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-bold mb-4">Moderar Mural de Recados</h2>
            <div id="messages-list" class="space-y-4"></div>
        </div>`;
}

/**
 * Gera o HTML para a aba de gerenciamento da lista de presentes.
 * @returns {string} O HTML da aba.
 */
export function renderGiftsManager() {
    return `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-bold mb-4">Adicionar Novo Presente</h2>
                <form id="add-gift-form" class="space-y-4">
                    <div><label class="block text-sm font-medium">Nome do Presente</label><input type="text" id="gift-name" class="w-full mt-1 p-2 border rounded" required></div>
                    <div><label class="block text-sm font-medium">URL da Imagem ou GIF (opcional)</label><input type="url" id="gift-image-url" class="w-full mt-1 p-2 border rounded" placeholder="https://..."></div>
                    <div><label class="block text-sm font-medium">Descrição (opcional)</label><textarea id="gift-description" class="w-full mt-1 p-2 border rounded" rows="3"></textarea></div>
                    <button type="submit" class="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700">Adicionar à Lista</button>
                </form>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-bold mb-4">Lista de Presentes</h2>
                <div id="gifts-list-admin" class="max-h-96 overflow-y-auto"></div>
            </div>
        </div>`;
}

/**
 * Gera o HTML para a aba da galeria de administração.
 * @returns {string} O HTML da aba.
 */
export function renderAdminGallery() {
    return `
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h2 class="text-xl font-bold mb-4">Moderar Galeria de Convidados</h2>
            <div id="admin-gallery-container" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                <!-- Fotos dos convidados serão carregadas aqui -->
            </div>
        </div>`;
}

/**
 * Atualiza a lista de convites gerados na DOM.
 * @param {Array<Object>} keys - A lista de chaves do Firestore.
 */
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
            <div class="p-3 border-b flex justify-between items-center">
                <div>
                    <p class="font-semibold">${key.guestName} <span class="text-xs font-normal text-gray-500">(${peopleText})</span></p>
                    <p class="text-sm font-mono text-gray-600">${key.key}</p>
                    ${key.isUsed ? `<p class="text-xs text-gray-500">Usado por: ${key.usedByEmail}</p>` : ''}
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-xs font-medium px-2 py-1 rounded-full ${usedClass}">Utilizado: ${usedText}</span>
                    <button data-id="${key.id}" class="edit-key-btn text-gray-400 hover:text-blue-600"><i class="fas fa-edit"></i></button>
                    <button data-id="${key.id}" class="delete-key-btn text-gray-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    }).join('');
}

/**
 * Atualiza a lista do relatório de convidados na DOM.
 * @param {Array<Object>} usedKeys - A lista de chaves usadas do Firestore.
 */
export function updateGuestsReport(usedKeys) {
    const listEl = document.getElementById('guests-report-list');
    const totalCountEl = document.getElementById('total-guests-count');
    if (!listEl || !totalCountEl) return;
    
    let totalGuests = 0;
    if (usedKeys.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhum convidado se cadastrou ainda.</p>`;
        totalCountEl.textContent = '0';
        return;
    }
    
    listEl.innerHTML = usedKeys.map(key => {
        totalGuests += key.allowedGuests || 1;
        const usedDate = key.usedAt ? key.usedAt.toDate().toLocaleString('pt-BR') : 'N/A';
        const peopleText = key.allowedGuests > 1 ? `${key.allowedGuests} pessoas` : `${key.allowedGuests} pessoa`;
        return `<div class="p-3 border-b">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-semibold">${key.guestName}</p>
                            <p class="text-sm text-gray-600">${key.usedByEmail}</p>
                        </div>
                        <span class="text-sm font-bold text-gray-700">${peopleText}</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-1">Cadastrado em: ${usedDate}</p>
                </div>`;
    }).join('');
    totalCountEl.textContent = totalGuests;
}

/**
 * Atualiza a lista de mensagens do mural na DOM.
 * @param {Array<Object>} messages - A lista de mensagens do Firestore.
 */
export function updateGuestbookAdminList(messages) {
    const listEl = document.getElementById('messages-list');
    if (!listEl) return;
    if (messages.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhuma mensagem no mural.</p>`;
        return;
    }
    listEl.innerHTML = messages.map(msg => `
        <div class="p-3 border rounded-md flex justify-between items-start">
            <div>
                <p class="text-sm">${msg.message}</p>
                <p class="text-xs text-gray-500 mt-1">- ${msg.userName}</p>
            </div>
            <button data-id="${msg.id}" class="delete-message-btn text-red-400 hover:text-red-600 flex-shrink-0 ml-4"><i class="fas fa-trash"></i></button>
        </div>`
    ).join('');
}

/**
 * Atualiza a lista de presentes no painel de admin.
 * @param {Array<Object>} gifts - A lista de presentes do Firestore.
 */
export function updateGiftsAdminList(gifts) {
    const listEl = document.getElementById('gifts-list-admin');
    if (!listEl) return;
    if (gifts.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhum presente adicionado.</p>`;
        return;
    }
    listEl.innerHTML = gifts.map(gift => {
        const takenClass = gift.isTaken ? 'bg-green-100' : '';
        return `
            <div class="p-3 border-b flex justify-between items-center ${takenClass}">
                <div class="flex items-center">
                    <img src="${gift.imageUrl || 'https://placehold.co/60x60/EEE/31343C?text=Presente'}" alt="${gift.name}" class="w-12 h-12 object-cover rounded-md mr-4">
                    <div>
                        <p class="font-semibold">${gift.name}</p>
                        ${gift.isTaken ? `<p class="text-xs text-green-700">Escolhido por: ${gift.takenBy}</p>` : ''}
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button data-id="${gift.id}" class="edit-gift-btn text-gray-400 hover:text-blue-600"><i class="fas fa-edit"></i></button>
                    <button data-id="${gift.id}" class="delete-gift-btn text-gray-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    }).join('');
}

/**
 * Atualiza a galeria de fotos no painel de admin.
 * @param {Array<Object>} photos - A lista de fotos do Firestore.
 */
export function updateAdminGallery(photos) {
    const container = document.getElementById('admin-gallery-container');
    if (!container) return;
    if (photos.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-500">Nenhuma foto foi enviada pelos convidados ainda.</p>`;
        return;
    }
    container.innerHTML = photos.map(photo => `
        <div class="relative group">
            <img src="${photo.imageUrl}" alt="Foto de ${photo.userName}" class="w-full h-full object-cover rounded-lg">
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex flex-col items-center justify-center text-white p-2">
                <p class="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-center">Enviada por:<br><strong>${photo.userName}</strong></p>
                <button data-id="${photo.id}" class="delete-photo-btn mt-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xl"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>
    `).join('');
}
