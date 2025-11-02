// js/admin-ui.js

// --- Funções de Ajuda e Otimização ---

const notyf = new Notyf({
    duration: 4000,
    position: { x: 'right', y: 'top' },
    types: [
        { type: 'success', backgroundColor: '#34D399', icon: { className: 'fas fa-check-circle', tagName: 'i', color: 'white' } },
        { type: 'error', backgroundColor: '#EF4444', icon: { className: 'fas fa-exclamation-circle', tagName: 'i', color: 'white' } },
        { type: 'info', backgroundColor: '#3B82F6', icon: { className: 'fas fa-info-circle', tagName: 'i', color: 'white' } }
    ]
});

/**
 * Exibe uma notificação toast.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'success' | 'error' | 'info'} type - O tipo de notificação.
 */
export function showToast(message, type = 'success') {
    notyf.open({ type, message });
}

function getOptimizedCloudinaryUrl(url) {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || 'https://placehold.co/400x400/EEE/31343C?text=Foto';
    }
    return url.replace('/image/upload/', '/image/upload/w_400,h_400,c_fill,q_auto,f_auto/');
}

export function setButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        if (!button.dataset.originalText) button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<div class="btn-spinner mx-auto" style="border-top-color: white;"></div>`;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
    }
}

export function showConfirmationModal({ title = 'Confirmar Ação', message = 'Você tem certeza?', confirmText = 'Confirmar', isDestructive = true }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmation-modal');
        document.getElementById('confirmation-title').textContent = title;
        document.getElementById('confirmation-message').textContent = message;
        const confirmBtn = document.getElementById('confirm-action-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');
        confirmBtn.textContent = confirmText;
        confirmBtn.className = `py-2 px-6 rounded-lg text-white transition-colors ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`;
        modal.classList.remove('hidden');
        const cleanup = () => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
        };
        const handleConfirm = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
    });
}

// --- Funções de Modais de Edição ---

function showEditModal(title, formContent, onSubmit) {
    const modal = document.getElementById('edit-modal');
    document.getElementById('edit-modal-title').textContent = title;
    const form = document.getElementById('edit-modal-form');
    form.innerHTML = formContent;

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        onSubmit(data);
    };

    form.addEventListener('submit', handleSubmit);
    document.getElementById('close-edit-modal').addEventListener('click', () => closeEditModal());
    modal.classList.remove('hidden');

    const cancelButton = form.querySelector('.cancel-edit-btn');
    cancelButton.addEventListener('click', () => closeEditModal());
}

export function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.add('hidden');
    const form = document.getElementById('edit-modal-form');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.innerHTML = '';
}

export function showEditKeyModal(keyData, onSave) {
    const formContent = `
        <div>
            <label class="block text-sm font-medium">Nome do Convidado</label>
            <input type="text" name="guestName" value="${keyData.guestName}" class="w-full mt-1 p-2 border rounded" required>
        </div>
        <div>
            <label class="block text-sm font-medium">Número de Pessoas</label>
            <input type="number" name="allowedGuests" value="${keyData.allowedGuests}" min="1" class="w-full mt-1 p-2 border rounded" required>
        </div>
        <div class="flex justify-end space-x-3 pt-4">
            <button type="button" class="cancel-edit-btn py-2 px-4 bg-gray-200 rounded">Cancelar</button>
            <button type="submit" class="py-2 px-4 bg-indigo-600 text-white rounded">Salvar</button>
        </div>
    `;
    showEditModal(`Editar Convite: ${keyData.guestName}`, formContent, (data) => {
        onSave({
            guestName: data.guestName,
            allowedGuests: parseInt(data.allowedGuests, 10)
        });
    });
}

export function showEditGiftModal(giftData, onSave) {
    const formContent = `
        <div><label class="block text-sm font-medium">Nome do Presente</label><input type="text" name="name" value="${giftData.name}" class="w-full mt-1 p-2 border rounded" required></div>
        <div><label class="block text-sm font-medium">Valor (R$)</label><input type="number" name="price" value="${giftData.price || 0}" step="0.01" min="0" class="w-full mt-1 p-2 border rounded" required></div>
        <div><label class="block text-sm font-medium">URL da Imagem</label><input type="url" name="imageUrl" value="${giftData.imageUrl || ''}" class="w-full mt-1 p-2 border rounded"></div>
        <div class="flex justify-end space-x-3 pt-4">
            <button type="button" class="cancel-edit-btn py-2 px-4 bg-gray-200 rounded">Cancelar</button>
            <button type="submit" class="py-2 px-4 bg-indigo-600 text-white rounded">Salvar</button>
        </div>
    `;
    showEditModal(`Editar Presente: ${giftData.name}`, formContent, (data) => {
        onSave({
            name: data.name,
            price: parseFloat(data.price),
            imageUrl: data.imageUrl
        });
    });
}

// NOVO: Modal para editar evento da timeline
export function showEditTimelineEventModal(eventData, onSave) {
    const formContent = `
        <div><label class="block text-sm font-medium">Data do Evento</label><input type="date" name="date" value="${eventData.date || ''}" class="w-full mt-1 p-2 border rounded" required></div>
        <div><label class="block text-sm font-medium">Título</label><input type="text" name="title" value="${eventData.title || ''}" class="w-full mt-1 p-2 border rounded" required></div>
        <div><label class="block text-sm font-medium">Descrição</label><textarea name="description" class="w-full mt-1 p-2 border rounded" rows="3">${eventData.description || ''}</textarea></div>
        <div><label class="block text-sm font-medium">URL da Imagem (opcional)</label><input type="url" name="imageUrl" value="${eventData.imageUrl || ''}" class="w-full mt-1 p-2 border rounded"></div>
        <div class="flex justify-end space-x-3 pt-4">
            <button type="button" class="cancel-edit-btn py-2 px-4 bg-gray-200 rounded">Cancelar</button>
            <button type="submit" class="py-2 px-4 bg-indigo-600 text-white rounded">Salvar</button>
        </div>
    `;
    showEditModal(`Editar Evento da Timeline`, formContent, onSave);
}

// --- Funções de Renderização do Layout ---

export function renderLoadingSpinner() {
    return `<div class="flex justify-center items-center p-20"><i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i></div>`;
}

export function renderSidebarNav() {
    const navItems = [
        { tab: 'report', icon: 'fa-chart-pie', label: 'Relatório' },
        { tab: 'keys', icon: 'fa-key', label: 'Convites' },
        { tab: 'notifications', icon: 'fa-bell', label: 'Notificações' }, // NOVO
        { tab: 'guestbook', icon: 'fa-book-open', label: 'Recados' },
        { tab: 'gifts', icon: 'fa-gift', label: 'Presentes' },
        { tab: 'admin-gallery', icon: 'fa-images', label: 'Galeria' },
        { tab: 'details', icon: 'fa-cogs', label: 'Configurações' },
    ];
    return navItems.map(item => `<a href="#" data-tab="${item.tab}" class="sidebar-link flex items-center py-3 px-4 my-1 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-all"><i class="fas ${item.icon} w-6 text-center"></i><span class="ml-3">${item.label}</span></a>`).join('');
}

export function setActiveSidebarLink(tabName) {
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const isSelected = link.dataset.tab === tabName;
        link.classList.toggle('bg-indigo-600', isSelected);
        link.classList.toggle('text-white', isSelected);
    });
}


// --- Funções de Renderização de Conteúdo das Abas ---

export function renderDetailsEditor(details) {
    const getDateForInput = (dateField) => {
        if (!dateField) return '';
        const date = dateField.toDate ? dateField.toDate() : dateField;
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    const getDateOnlyForInput = (dateField) => {
        if (!dateField) return '';
        const date = dateField.toDate ? dateField.toDate() : dateField;
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
    };

    const weddingDateISO = getDateForInput(details.weddingDate);
    const rsvpDateISO = getDateOnlyForInput(details.rsvpDate);

    const whatsappTemplate = details.whatsappMessageTemplate || `Olá, {nome_convidado}! ❤️ Com muita alegria, estamos enviando o convite digital para o nosso casamento. Por favor, acesse o link abaixo para confirmar sua presença e encontrar todos os detalhes do nosso grande dia. Mal podemos esperar para celebrar com você! Com carinho, {nomes_casal}. {link_convite}`;

    const paletteGroups = {
        'Padrinhos': details.dressCodePalettes?.Padrinhos || [],
        'Madrinhas': details.dressCodePalettes?.Madrinhas || [],
        'Amigos do Noivo': details.dressCodePalettes?.['Amigos do Noivo'] || [],
        'Amigas da Noiva': details.dressCodePalettes?.['Amigas da Noiva'] || [],
    };

    const paletteEditorHTML = Object.entries(paletteGroups).map(([group, colors]) => `
        <div class="palette-group border-t pt-4" data-group="${group}">
            <h4 class="text-md font-semibold text-gray-700 mb-3">${group}</h4>
            <div class="flex items-center gap-2 mb-3">
                <input type="color" class="w-10 h-10 p-0 border-none rounded-md" value="#88aabb">
                <button type="button" class="add-color-btn px-3 py-2 bg-blue-500 text-white text-sm rounded" data-group="${group}">Adicionar Cor</button>
            </div>
            <div class="palette-colors flex flex-wrap gap-2">
                ${colors.map(color => `
                    <div class="relative group w-12 h-12 rounded-full border-2 border-white shadow-md" style="background-color: ${color};">
                        <button type="button" class="delete-color-btn absolute inset-0 bg-red-500 bg-opacity-80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-color="${color}" data-group="${group}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    const pdfSectionHTML = `
        <div class="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 class="text-md font-semibold text-blue-800 mb-3">Gerar PDFs das Paletas</h4>
            <p class="text-sm text-blue-600 mb-4">Os convidados especiais podem baixar PDFs personalizados com suas paletas de cores.</p>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                ${Object.keys(paletteGroups).map(group => `
                    <button type="button" id="preview-pdf-${group.toLowerCase().replace(/\s+/g, '-')}" 
                            class="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors flex items-center justify-center"
                            data-role="${group}">
                        <i class="fas fa-file-pdf mr-1"></i>
                        ${group}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    const carouselPhotosHTML = (details.carouselPhotos || []).map((url, index) => `
        <div class="relative group">
            <img src="${getOptimizedCloudinaryUrl(url)}" class="w-24 h-24 object-cover rounded-md" data-url="${url}">
            <button type="button" class="delete-carousel-photo-btn absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100">&times;</button>
        </div>
    `).join('');

    return `
        <div class="bg-white p-6 rounded-lg shadow-md max-w-3xl mx-auto space-y-6">
            <div>
                <h2 class="text-2xl font-bold text-gray-800 border-b pb-2">Configurações Gerais</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div><label class="block text-sm font-medium">Nomes do Casal</label><input type="text" id="form-couple-names" value="${details.coupleNames || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Data e Hora</label><input type="datetime-local" id="form-wedding-date" value="${weddingDateISO}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Data Limite para RSVP</label><input type="date" id="form-rsvp-date" value="${rsvpDateISO}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Local da Cerimônia</label><input type="text" id="form-venue" value="${details.venue || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Dress Code</label><input type="text" id="form-dress-code" value="${details.dressCode || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Nome do Restaurante</label><input type="text" id="form-restaurant-name" value="${details.restaurantName || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Endereço do Restaurante</label><input type="text" id="form-restaurant-address" value="${details.restaurantAddress || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div><label class="block text-sm font-medium">Informação de Valor</label><input type="text" id="form-restaurant-price" value="${details.restaurantPriceInfo || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div class="md:col-span-2"><label class="block text-sm font-medium">Link do Google Maps</label><input type="url" id="form-restaurant-mapslink" value="${details.restaurantMapsLink || ''}" class="w-full mt-1 p-2 border rounded"></div>
                    <div class="md:col-span-2"><label class="block text-sm font-medium">Sua Chave PIX</label><input type="text" id="form-pix-key" value="${details.pixKey || ''}" class="w-full mt-1 p-2 border rounded" placeholder="CPF, e-mail, telefone ou chave aleatória"></div>
                </div>
            </div>

            <div class="border-t pt-4">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Fotos e Mídia</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">Fotos do Carrossel (Página Inicial)</label>
                        <div class="flex items-center gap-2">
                           <input type="url" id="new-carousel-photo-url" class="w-full p-2 border rounded" placeholder="Cole a URL da imagem aqui...">
                           <button id="add-carousel-photo-btn" class="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 flex-shrink-0">Adicionar</button>
                        </div>
                        <div id="carousel-photos-preview" class="flex flex-wrap gap-2 mt-2">${carouselPhotosHTML}</div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-2">Foto da Igreja/Local (Página de Detalhes)</label>
                        <input type="file" id="venue-photo-input" class="hidden" accept="image/*">
                        <input type="hidden" id="form-venue-photo-url" value="${details.venuePhoto || ''}">
                        <button type="button" onclick="document.getElementById('venue-photo-input').click()" class="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600">
                             <i class="fas fa-camera mr-2"></i>Escolher Arquivo
                        </button>
                        <div id="venue-photo-progress-container" class="mt-2 w-full bg-gray-200 rounded-full h-2.5 hidden"><div id="venue-photo-progress-bar" class="bg-green-600 h-2.5 rounded-full" style="width: 0%"></div></div>
                        <div id="venue-photo-preview" class="mt-2">
                            ${details.venuePhoto ? `<img src="${getOptimizedCloudinaryUrl(details.venuePhoto)}" class="rounded-lg max-w-xs shadow-md">` : ''}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="border-t pt-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-share-alt text-indigo-600 mr-2"></i>
                    Imagem para Compartilhamento
                </h3>
                
                <div class="bg-blue-50 p-4 rounded-lg mb-4">
                    <div class="flex items-start">
                        <i class="fas fa-info-circle text-blue-500 mt-1 mr-3 flex-shrink-0"></i>
                        <div class="text-sm text-blue-700">
                            <p class="font-semibold mb-1">Para que serve esta imagem?</p>
                            <p>Esta é a imagem que será enviada quando você compartilhar convites via WhatsApp. 
                            Pode ser um design personalizado do convite, foto do casal, ou qualquer imagem representativa.</p>
                            <p class="mt-2 text-xs">
                                <strong>Sem imagem?</strong> O link será enviado normalmente no WhatsApp.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-2">
                            Upload da Imagem de Compartilhamento
                            <span class="text-xs text-gray-500 ml-2">(Recomendado: 1080x1350px)</span>
                        </label>
                        
                        <input type="file" id="share-image-input" class="hidden" accept="image/*">
                        <input type="hidden" id="form-share-image-url" value="${details.shareImage || ''}">
                        
                        <div class="flex gap-2 flex-wrap">
                            <button type="button" onclick="document.getElementById('share-image-input').click()"
                                    class="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center transition-colors">
                                <i class="fas fa-upload mr-2"></i>
                                ${details.shareImage ? 'Trocar Imagem' : 'Escolher Imagem'}
                            </button>
                            
                            ${details.shareImage ? `
                                <button type="button" id="remove-share-image-btn"
                                        class="py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                                    <i class="fas fa-trash mr-2"></i>Remover
                                </button>
                            ` : ''}
                        </div>
                        
                        <div id="share-image-progress-container" class="mt-2 w-full bg-gray-200 rounded-full h-2.5 hidden">
                            <div id="share-image-progress-bar" class="bg-green-600 h-2.5 rounded-full transition-all" style="width: 0%"></div>
                        </div>
                        
                        <div id="share-image-preview" class="mt-4">
                            ${details.shareImage ? `
                                <div class="relative inline-block">
                                    <img src="${getOptimizedCloudinaryUrl(details.shareImage)}"
                                        class="rounded-lg max-w-sm shadow-lg border-4 border-green-100"
                                        alt="Imagem de compartilhamento">
                                    <div class="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center">
                                        <i class="fas fa-check-circle mr-1"></i>Ativa
                                    </div>
                                </div>
                                <div class="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                    <p class="text-sm text-green-700 flex items-center">
                                        <i class="fas fa-whatsapp text-green-600 mr-2"></i>
                                        Esta imagem será enviada ao compartilhar convites no WhatsApp
                                    </p>
                                </div>
                            ` : `
                                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                                    <i class="fas fa-image text-5xl text-gray-300 mb-3"></i>
                                    <p class="text-sm font-medium text-gray-600 mb-1">Nenhuma imagem personalizada</p>
                                    <p class="text-xs text-gray-500">
                                        Apenas o texto e link serão enviados
                                    </p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <div class="border-t pt-4">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Paletas de Cores</h3>
                <div id="palette-editor" class="space-y-6">${paletteEditorHTML}</div>
                ${pdfSectionHTML}
            </div>

            <div class="border-t pt-4">
                <label class="block text-sm font-medium">Modelo de Mensagem para WhatsApp</label>
                <textarea id="form-whatsapp-template" class="w-full mt-1 p-2 border rounded" rows="5">${whatsappTemplate}</textarea>
                <p class="text-xs text-gray-500 mt-1">Use {nome_convidado}, {nomes_casal} e {link_convite} para personalização.</p>
            </div>
            
            <div class="border-t pt-6">
    <h3 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-image text-indigo-600 mr-2"></i>
        Background da Página Inicial
    </h3>
    
    <div class="space-y-4">
        <div class="flex items-center">
            <input type="checkbox" id="home-bg-enabled" 
                ${details.homeBackground?.enabled ? 'checked' : ''}
                class="w-4 h-4 text-primary">
            <label for="home-bg-enabled" class="ml-2 text-sm font-medium">
                Ativar imagem de fundo
            </label>
        </div>
        
        <div>
            <label class="block text-sm font-medium mb-2">Orientação da Imagem</label>
            <select id="home-bg-orientation" class="w-full p-2 border rounded">
                <option value="horizontal" ${details.homeBackground?.orientation === 'horizontal' ? 'selected' : ''}>
                    Horizontal (Paisagem)
                </option>
                <option value="vertical" ${details.homeBackground?.orientation === 'vertical' ? 'selected' : ''}>
                    Vertical (Retrato)
                </option>
            </select>
        </div>
        
        <div>
            <label class="block text-sm font-medium mb-2">
                Escurecer Fundo (0 = transparente, 1 = muito escuro)
            </label>
            <input type="range" id="home-bg-opacity" min="0" max="1" step="0.1"
                value="${details.homeBackground?.opacity || 0.3}"
                class="w-full">
            <span id="opacity-value" class="text-sm text-gray-600">
                ${(details.homeBackground?.opacity || 0.3) * 100}%
            </span>
        </div>
        
        <div>
            <label class="block text-sm font-medium mb-2">Upload da Imagem de Fundo</label>
            <input type="file" id="home-bg-input" class="hidden" accept="image/*">
            <input type="hidden" id="form-home-bg-url" value="${details.homeBackground?.imageUrl || ''}">
            
            <button type="button" 
                    onclick="document.getElementById('home-bg-input').click()"
                    class="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600">
                <i class="fas fa-upload mr-2"></i>Escolher Imagem
            </button>
            
            <div id="home-bg-progress-container" class="mt-2 w-full bg-gray-200 rounded-full h-2.5 hidden">
                <div id="home-bg-progress-bar" class="bg-green-600 h-2.5 rounded-full" style="width: 0%"></div>
            </div>
            
            <div id="home-bg-preview" class="mt-2">
                ${details.homeBackground?.imageUrl ? 
                    `<img src="${details.homeBackground.imageUrl}" class="rounded-lg max-w-xs shadow-md">` 
                    : ''}
            </div>
        </div>
    </div>
</div>

<div class="border-t pt-6">
    <h3 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-heart text-red-600 mr-2"></i>
        Seção "Sobre Nós"
    </h3>
    
    <div class="space-y-4">
        <div>
            <label class="block text-sm font-medium mb-2">Modo de Exibição</label>
            <select id="about-mode" class="w-full p-2 border rounded">
                <option value="timeline" ${details.aboutUs?.mode === 'timeline' ? 'selected' : ''}>
                    Timeline de Eventos
                </option>
                <option value="text" ${details.aboutUs?.mode === 'text' ? 'selected' : ''}>
                    Texto Livre + Foto
                </option>
            </select>
        </div>
        
        <div id="about-text-config" class="${details.aboutUs?.mode === 'text' ? '' : 'hidden'}">
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium">Título</label>
                    <input type="text" id="about-text-title" 
                        value="${details.aboutUs?.text?.title || 'Nossa História'}"
                        class="w-full mt-1 p-2 border rounded">
                </div>
                
                <div>
                    <label class="block text-sm font-medium">Conteúdo</label>
                    <textarea id="about-text-content" rows="10"
                            class="w-full mt-1 p-2 border rounded"
                            placeholder="Conte aqui a história do casal...">${details.aboutUs?.text?.content || ''}</textarea>
                </div>
                
                <div>
                    <label class="block text-sm font-medium mb-2">Imagem Principal</label>
                    <input type="file" id="about-text-image-input" class="hidden" accept="image/*">
                    <input type="hidden" id="form-about-text-image-url" 
                        value="${details.aboutUs?.text?.imageUrl || ''}">
                    
                    <button type="button" 
                            onclick="document.getElementById('about-text-image-input').click()"
                            class="py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600">
                        <i class="fas fa-camera mr-2"></i>Escolher Foto
                    </button>
                    
                    <div id="about-text-image-progress-container" class="mt-2 w-full bg-gray-200 rounded-full h-2.5 hidden">
                        <div id="about-text-image-progress-bar" class="bg-green-600 h-2.5 rounded-full" style="width: 0%"></div>
                    </div>
                    
                    <div id="about-text-image-preview" class="mt-2">
                        ${details.aboutUs?.text?.imageUrl ? 
                            `<img src="${details.aboutUs.text.imageUrl}" class="rounded-lg max-w-xs shadow-md">` 
                            : ''}
                    </div>
                </div>
            </div>
        </div>
        
        <p class="text-sm text-gray-500 mt-2">
            <i class="fas fa-info-circle mr-1"></i>
            Timeline usa os eventos já cadastrados na aba "Timeline". 
            Texto Livre permite escrever livremente sobre o casal.
        </p>
    </div>
</div>

            <button id="save-all-details-button" class="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Salvar Todas as Alterações</button>
            <p id="details-success" class="text-green-600 text-sm text-center hidden">Detalhes salvos com sucesso!</p>
        </div>`;
}

export function renderKeyManager() {
    return `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Gerenciador de Convites</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
                <h3 class="text-xl font-bold mb-4">Gerar Novo Convite</h3>
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium">Nome do Convidado (ou Família)</label><input type="text" id="guest-name" class="w-full mt-1 p-2 border rounded" placeholder="Ex: Família Silva"></div>
                    <div><label class="block text-sm font-medium">Telefone (com DDI e DDD)</label><input type="tel" id="guest-phone" class="w-full mt-1 p-2 border rounded" placeholder="Ex: 5571999998888"></div>
                    <div>
                        <label class="block text-sm font-medium">Função do Convidado</label>
                        <select id="guest-role" class="w-full mt-1 p-2 border rounded bg-white">
                            <option value="Convidado">Convidado(a)</option>
                            <option value="Padrinho">Padrinho</option>
                            <option value="Madrinha">Madrinha</option>
                            <option value="Amigo do Noivo">Amigo do Noivo</option>
                            <option value="Amiga da Noiva">Amiga da Noiva</option>
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
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold">Convites Gerados</h3>
                    <input type="search" id="search-keys-input" placeholder="Buscar por nome..." class="p-2 border rounded w-1/2">
                </div>
                <div id="keys-list" class="max-h-[60vh] overflow-y-auto custom-scrollbar"></div>
            </div>
        </div>`;
}

export function renderTimelineManager() {
    return `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Gerenciar Timeline do Casal</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
                <h3 class="text-xl font-bold mb-4">Adicionar Novo Evento</h3>
                <form id="add-timeline-event-form" class="space-y-4">
                    <div><label class="block text-sm font-medium">Data</label><input type="date" id="timeline-date" class="w-full mt-1 p-2 border rounded" required></div>
                    <div><label class="block text-sm font-medium">Título</label><input type="text" id="timeline-title" class="w-full mt-1 p-2 border rounded" required></div>
                    <div><label class="block text-sm font-medium">Descrição</label><textarea id="timeline-description" class="w-full mt-1 p-2 border rounded" rows="4"></textarea></div>
                    <div>
                        <label class="block text-sm font-medium">Imagem (opcional)</label>
                        <input type="file" id="timeline-image-input" class="hidden" accept="image/*">
                        <input type="hidden" id="timeline-image-url">
                        <button type="button" onclick="document.getElementById('timeline-image-input').click()" class="w-full mt-1 py-2 px-4 border border-dashed rounded hover:bg-gray-50">Escolher Imagem</button>
                        <div id="timeline-image-progress-container" class="mt-2 w-full bg-gray-200 rounded-full h-2.5 hidden"><div class="bg-green-600 h-2.5 rounded-full" style="width: 0%"></div></div>
                        <div id="timeline-image-preview" class="mt-2"></div>
                    </div>
                    <button type="submit" class="w-full py-2 px-4 bg-indigo-600 text-white rounded hover:bg-indigo-700">Adicionar Evento</button>
                </form>
            </div>
            <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h3 class="text-xl font-bold mb-4">Eventos da Timeline</h3>
                <div id="timeline-events-list" class="max-h-[70vh] overflow-y-auto custom-scrollbar"></div>
            </div>
        </div>
    `;
}

export function renderGuestsReport() {
    return `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Relatório de Convidados</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                 <h3 class="text-lg font-bold text-gray-600 mb-2">Pessoas Confirmadas</h3>
                 <p id="total-guests-count" class="text-5xl font-bold text-indigo-600"><i class="fas fa-spinner fa-spin"></i></p>
            </div>
            <div class="bg-white p-6 rounded-lg shadow-md text-center lg:col-span-2">
                 <h3 class="text-lg font-bold text-gray-600 mb-2">Divisão de Presença</h3>
                 <div class="max-w-xs mx-auto"><canvas id="rsvp-chart"></canvas></div>
            </div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
            <div class="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <h3 class="text-xl font-bold">Lista de Confirmações</h3>
                <input type="search" id="search-report-input" placeholder="Buscar por nome ou email..." class="p-2 border rounded w-full md:w-1/2">
                <button id="export-csv-button" class="w-full md:w-auto py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-file-csv mr-2"></i>Exportar
                </button>
            </div>
            <div id="guests-report-list" class="max-h-[50vh] overflow-y-auto custom-scrollbar"></div>
        </div>`;
}

export function renderGuestbookAdmin() {
    return `<div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold text-gray-800 mb-6">Moderar Mural de Recados</h2><div id="messages-list" class="space-y-4"></div></div>`;
}

export function renderGiftsManager() {
    return `
        <h2 class="text-2xl font-bold text-gray-800 mb-6">Gerenciar Lista de Presentes</h2>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow-md h-fit">
                <h3 class="text-xl font-bold mb-4">Adicionar Novo Presente</h3>
                <form id="add-gift-form" class="space-y-4">
                    <div><label class="block text-sm font-medium">Nome do Presente</label><input type="text" id="gift-name" class="w-full mt-1 p-2 border rounded" required></div>
                    <div><label class="block text-sm font-medium">Valor (R$)</label><input type="number" id="gift-price" class="w-full mt-1 p-2 border rounded" placeholder="Ex: 150.00" step="0.01" min="0" required></div>
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
    return `<div class="bg-white p-6 rounded-lg shadow-md"><h2 class="text-2xl font-bold text-gray-800 mb-6">Moderar Galeria de Convidados</h2><div id="admin-gallery-container" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"></div></div>`;
}


// --- Funções de Atualização de Listas ---

export function updateKeysList(keys) {
    const listEl = document.getElementById('keys-list');
    if (!listEl) return;
    if (keys.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhum convite encontrado.</p>`;
        return;
    }
    listEl.innerHTML = keys.map(key => {
        const usedClass = key.isUsed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';
        const usedText = key.isUsed ? `Sim` : 'Não';
        const peopleText = key.allowedGuests > 1 ? `${key.allowedGuests} pessoas` : `${key.allowedGuests} pessoa`;
        const roleText = key.role && key.role !== 'Convidado' ? `<span class="text-xs font-semibold text-indigo-600">${key.role}</span>` : '';

        return `
            <div class="p-3 border-b flex justify-between items-center hover:bg-gray-50">
                <div>
                    <p class="font-semibold">${key.guestName} ${roleText}</p>
                    <p class="text-sm text-gray-500">${peopleText}</p>
                    <p class="text-sm font-mono text-gray-600">${key.id}</p>
                    ${key.isUsed ? `<p class="text-xs text-gray-500">Usado por: ${key.usedByEmail}</p>` : ''}
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
    if (!listEl || !totalCountEl) return { restaurantGuests: 0, ceremonyOnlyGuests: 0 };

    let totalGuests = 0;
    let restaurantGuests = 0;

    if (usedKeys.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhum convidado se cadastrou ainda.</p>`;
        totalCountEl.textContent = '0';
        return { restaurantGuests: 0, ceremonyOnlyGuests: 0 };
    }

    listEl.innerHTML = usedKeys.map(key => {
        totalGuests += key.allowedGuests || 1;
        if (key.willAttendRestaurant) restaurantGuests += key.allowedGuests || 1;

        const usedDate = key.usedAt ? key.usedAt.toDate().toLocaleString('pt-BR') : 'N/A';
        const peopleText = key.allowedGuests > 1 ? `${key.allowedGuests} pessoas` : `${key.allowedGuests} pessoa`;
        const restaurantIcon = key.willAttendRestaurant ? `<i class="fas fa-utensils text-green-500" title="Irá ao restaurante"></i>` : `<i class="fas fa-church text-gray-400" title="Apenas cerimônia"></i>`;

        return `<div class="p-3 border-b hover:bg-gray-50"><div class="flex justify-between items-start cursor-pointer report-item" data-id="${key.id}"><div><p class="font-semibold">${key.guestName}</p><p class="text-sm text-gray-600">${key.usedByEmail || ''}</p></div><div class="flex items-center space-x-3"><span class="text-sm font-bold text-gray-700">${peopleText}</span>${restaurantIcon}</div></div><p class="text-xs text-gray-400 mt-1">Cadastrado em: ${usedDate}</p><div id="guest-names-list-${key.id}" class="hidden mt-2 pl-4 border-l-2 border-gray-200"><p class="text-xs text-gray-500">Carregando nomes...</p></div></div>`;
    }).join('');

    totalCountEl.textContent = totalGuests;
    const ceremonyOnlyGuests = totalGuests - restaurantGuests;

    return { restaurantGuests, ceremonyOnlyGuests };
}

export function renderReportChart({ restaurantGuests, ceremonyOnlyGuests }) {
    const ctx = document.getElementById('rsvp-chart');
    if (!ctx) return null;
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Irão ao Restaurante', 'Apenas Cerimônia'],
            datasets: [{
                data: [restaurantGuests, ceremonyOnlyGuests],
                backgroundColor: ['#4CAF50', '#60A5FA'],
                borderColor: '#FFFFFF',
                borderWidth: 2
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } } }
    });
}

export function updateGuestbookAdminList(messages) {
    const listEl = document.getElementById('messages-list');
    if (!listEl) return;
    if (messages.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhuma mensagem no mural.</p>`;
        return;
    }
    listEl.innerHTML = messages.map(msg => `<div class="p-3 border rounded-md flex justify-between items-start hover:bg-gray-50"><div><p class="text-sm">${msg.message}</p><p class="text-xs text-gray-500 mt-1">- ${msg.userName}</p></div><button data-id="${msg.id}" class="delete-message-btn text-red-400 hover:text-red-600 flex-shrink-0 ml-4" aria-label="Excluir mensagem"><i class="fas fa-trash"></i></button></div>`).join('');
}

// ========= MODIFICADO =========
export function updateGiftsAdminList(gifts) {
    const listEl = document.getElementById('gifts-list-admin');
    if (!listEl) return;
    if (gifts.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhum presente adicionado.</p>`;
        return;
    }
    listEl.innerHTML = gifts.map(gift => {
        const contributors = gift.contributors || [];
        const hasContributors = contributors.length > 0;
        const takenClass = hasContributors ? 'bg-green-50' : '';
        const optimizedImageUrl = getOptimizedCloudinaryUrl(gift.imageUrl);
        const formattedPrice = gift.price ? `R$ ${Number(gift.price).toFixed(2).replace('.', ',')}` : 'Valor não definido';

        // Cria a lista de nomes dos contribuidores
        let contributorsListHTML = '';
        if (hasContributors) {
            const contributorNames = contributors.map(c => c.userName).join(', ');
            contributorsListHTML = `<p class="text-xs text-green-700 mt-1">Contribuído por: <strong>${contributorNames}</strong></p>`;
        }

        return `
            <div class="p-3 border-b flex justify-between items-center hover:bg-gray-50 ${takenClass}">
                <div class="flex items-center">
                    <img src="${optimizedImageUrl}" alt="${gift.name}" class="w-12 h-12 object-cover rounded-md mr-4">
                    <div>
                        <p class="font-semibold">${gift.name}</p>
                        <p class="text-sm font-bold text-indigo-600">${formattedPrice}</p>
                        ${contributorsListHTML}
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button data-id="${gift.id}" class="edit-gift-btn text-gray-400 hover:text-blue-600" aria-label="Editar presente"><i class="fas fa-edit"></i></button>
                    <button data-id="${gift.id}" class="delete-gift-btn text-gray-400 hover:text-red-600" aria-label="Excluir presente"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    }).join('');
}
// ========= FIM DA MODIFICAÇÃO =========

export function updateTimelineEventsList(events) {
    const listEl = document.getElementById('timeline-events-list');
    if (!listEl) return;
    if (events.length === 0) {
        listEl.innerHTML = `<p class="text-center text-gray-500 p-4">Nenhum evento na timeline.</p>`;
        return;
    }
    listEl.innerHTML = events.map(event => `
        <div class="p-3 border-b flex justify-between items-start hover:bg-gray-50">
            <div class="flex items-start">
                ${event.imageUrl ? `<img src="${getOptimizedCloudinaryUrl(event.imageUrl)}" alt="${event.title}" class="w-16 h-16 object-cover rounded-md mr-4">` : ''}
                <div>
                    <p class="font-semibold text-gray-800">${event.title}</p>
                    <p class="text-sm text-gray-500">${new Date(event.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                    <p class="text-xs text-gray-600 mt-1">${event.description || ''}</p>
                </div>
            </div>
            <div class="flex space-x-2 flex-shrink-0 ml-4">
                <button data-id="${event.id}" class="edit-timeline-event-btn text-gray-400 hover:text-blue-600" aria-label="Editar evento"><i class="fas fa-edit"></i></button>
                <button data-id="${event.id}" class="delete-timeline-event-btn text-gray-400 hover:text-red-600" aria-label="Excluir evento"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

export function updateAdminGallery(photos) {
    const container = document.getElementById('admin-gallery-container');
    if (!container) return;
    if (photos.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-500">Nenhuma foto foi enviada pelos convidados ainda.</p>`;
        return;
    }
    container.innerHTML = photos.map(photo => `<div class="relative group"><img src="${getOptimizedCloudinaryUrl(photo.imageUrl)}" alt="Foto de ${photo.userName}" class="w-full h-full object-cover rounded-lg shadow-md"><div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex flex-col items-center justify-center text-white p-2 rounded-lg"><p class="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-center">Enviada por:<br><strong>${photo.userName}</strong></p><button data-id="${photo.id}" class="delete-photo-btn mt-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xl" aria-label="Excluir foto"><i class="fas fa-trash-alt"></i></button></div></div>`).join('');
}

export function renderNotificationManager() {
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
                            <option value="💍">💍 Cerimônia</option>
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