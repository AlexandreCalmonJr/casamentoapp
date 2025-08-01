/**
 * Otimiza uma URL do Cloudinary para uma thumbnail.
 * @param {string} url - A URL original.
 * @param {string} transformations - As transformações a serem aplicadas.
 * @returns {string} A URL otimizada.
 */
function getOptimizedCloudinaryUrl(url, transformations = 'w_400,h_400,c_fill,q_auto') {
    if (!url || !url.includes('res.cloudinary.com')) {
        return url || `https://placehold.co/400x300/EEE/31343C?text=Presente`;
    }
    return url.replace('/image/upload/', `/image/upload/${transformations}/`);
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
        button.innerHTML = `<div class="btn-spinner mx-auto"></div>`;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    }
}

/**
 * Gera o HTML para uma view específica.
 * @param {string} viewName - O nome da view ('home', 'details', etc.).
 * @param {firebase.User|null} user - O usuário autenticado.
 * @param {Object} weddingDetails - Os detalhes do casamento vindos do Firestore.
 * @returns {string} - O HTML da view.
 */
export function generateViewHTML(viewName, user, weddingDetails) {
    if (!weddingDetails) {
        return `<div class="text-center p-8">
            <div class="animate-pulse">
                <div class="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-4"></div>
                <div class="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
            </div>
        </div>`;
    }

    const formatDate = (date) => {
        try {
            return date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        } catch (error) { return 'Data não disponível'; }
    };

    const formatTime = (date) => {
        try {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch (error) { return 'Horário não disponível'; }
    };

    switch (viewName) {
        case 'home':
            return `
                <div class="space-y-8 text-center">
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-8">
                        <h1 class="text-5xl font-cursive text-primary dark:text-dark-primary mb-4">${weddingDetails.coupleNames || 'Nosso Casamento'}</h1>
                        <p class="text-gray-600 dark:text-gray-400">Temos a honra de convidar para a celebração do nosso amor!</p>
                    </div>
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">
                        <h2 class="text-xl font-medium mb-4">Contagem Regressiva</h2>
                        <div id="countdown" class="flex justify-center space-x-2 md:space-x-4"></div>
                    </div>
                </div>`;
        
        case 'details':
            return `
                <div class="space-y-6">
                    <div class="text-center"><h1 class="text-3xl font-cursive mb-2">Detalhes do Evento</h1></div>
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6 space-y-4">
                        <h3 class="text-lg font-semibold border-b pb-2 mb-3">Cerimônia</h3>
                        <div class="flex items-center"><i class="fas fa-calendar-alt fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${formatDate(weddingDetails.weddingDate)}</span></div>
                        <div class="flex items-center"><i class="fas fa-clock fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${formatTime(weddingDetails.weddingDate)}h</span></div>
                        <div class="flex items-center"><i class="fas fa-map-marker-alt fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.venue || 'Local a ser definido'}</span></div>
                        <div class="flex items-center"><i class="fas fa-user-tie fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>Traje: ${weddingDetails.dressCode || 'A definir'}</span></div>
                    </div>
                    ${weddingDetails.restaurantName ? `
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6 space-y-4">
                        <h3 class="text-lg font-semibold border-b pb-2 mb-3">Comemoração Pós-Cerimônia</h3>
                        <div class="flex items-center"><i class="fas fa-utensils fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.restaurantName}</span></div>
                        <div class="flex items-center"><i class="fas fa-map-pin fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.restaurantAddress || 'Endereço a ser definido'}</span></div>
                        <div class="flex items-center"><i class="fas fa-dollar-sign fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.restaurantPriceInfo || 'Valores a confirmar'}</span></div>
                        ${weddingDetails.restaurantMapsLink ? `<a href="${weddingDetails.restaurantMapsLink}" target="_blank" class="block w-full text-center mt-4 py-2 px-4 bg-primary text-white font-medium rounded-lg">Ver no Google Maps</a>` : ''}
                    </div>` : ''}
                </div>`;
        
        case 'guest-photos':
            return `
                <div class="space-y-6">
                    <div class="text-center"><h1 class="text-3xl font-cursive mb-2">Galeria dos Convidados</h1></div>
                    ${user ? `
                        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">
                            <p class="text-center mb-4">Olá, ${user.displayName}! Compartilhe seus registros.</p>
                            <div class="flex flex-col sm:flex-row items-center gap-4">
                                <input type="file" id="photo-input" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 dark:file:bg-dark-primary/20 dark:file:text-dark-primary"/>
                                <button id="upload-button" class="bg-primary text-white px-4 py-2 rounded-lg w-full sm:w-auto flex-shrink-0"><i class="fas fa-upload mr-2"></i>Enviar</button>
                            </div>
                            <div id="upload-progress-container" class="mt-4 hidden"><div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"><div id="progress-bar" class="bg-primary h-2.5 rounded-full" style="width: 0%"></div></div></div>
                            <p id="upload-error" class="text-red-500 text-sm mt-2 hidden"></p>
                        </div>
                        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">
                            <h2 class="text-xl font-medium mb-4 flex items-center"><i class="fas fa-camera-retro text-primary dark:text-dark-primary mr-2"></i>Caça ao Tesouro Fotográfica!</h2>
                            <ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                                <li>Uma foto com alguém que você acabou de conhecer</li>
                                <li>Uma foto do seu detalhe favorito da decoração</li>
                                <li>Uma selfie com os noivos</li>
                                <li>A foto mais divertida do casamento!</li>
                            </ul>
                        </div>
                    ` : `
                        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-8 text-center">
                            <i class="fas fa-lock text-3xl text-gray-400 mb-4"></i>
                            <h2 class="text-xl font-medium mb-2">Galeria Exclusiva</h2>
                            <p class="text-gray-600 dark:text-gray-400">Para ver e enviar fotos, por favor, faça o login na aba "Acesso".</p>
                        </div>
                    `}
                    <div id="photo-gallery" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"></div>
                </div>`;
        case 'guestbook':
            return `
                <div class="space-y-6">
                    <div class="text-center"><h1 class="text-3xl font-cursive mb-2">Mural de Recados</h1></div>
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">
                        ${user ? `
                            <h2 class="text-xl font-medium mb-4">Deixe sua mensagem de carinho</h2>
                            <form id="guestbook-form" class="space-y-4">
                                <textarea id="guestbook-message" class="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" rows="4" placeholder="Escreva sua mensagem aqui..." required></textarea>
                                <button type="submit" class="w-full py-2 bg-primary text-white rounded">Enviar Mensagem</button>
                                <p id="guestbook-error" class="text-red-500 text-sm hidden"></p>
                            </form>
                        ` : `
                            <div class="text-center">
                                <p class="mb-4">Faça login para deixar uma mensagem no nosso mural de recados!</p>
                                <button id="open-login-button" class="w-full py-2 px-4 bg-primary hover:bg-opacity-90 text-white font-medium rounded-lg">Fazer Login</button>
                            </div>
                        `}
                    </div>
                    <div id="guestbook-messages" class="space-y-4"></div>
                </div>`;
        case 'gifts':
            return `
                <div class="space-y-6">
                    <div class="text-center"><h1 class="text-3xl font-cursive mb-2">Lista de Presentes</h1></div>
                    ${user ? `
                        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">
                            <p class="text-center text-gray-600 dark:text-gray-400 mb-6">Sua presença é o nosso maior presente! Mas se desejar nos presentear, preparamos com carinho esta lista de sugestões.</p>
                            <div id="gift-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                        </div>
                    ` : `
                        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-8 text-center">
                            <i class="fas fa-lock text-3xl text-gray-400 mb-4"></i>
                            <h2 class="text-xl font-medium mb-2">Lista Exclusiva</h2>
                            <p class="text-gray-600 dark:text-gray-400">Para ver nossa lista de presentes, por favor, faça o login na aba "Acesso".</p>
                        </div>
                    `}
                </div>`;
        case 'rsvp':
            return `
                <div class="text-center"><h1 class="text-3xl font-cursive mb-2">Acesso dos Convidados</h1></div>
                <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-8 max-w-lg mx-auto text-center">
                    ${user ? `
                        <i class="fas fa-check-circle text-green-500 text-4xl mb-4"></i>
                        <h2 class="text-xl font-medium mb-2">Você já está logado!</h2>
                        <p class="text-gray-600 dark:text-gray-400">Olá, ${user.displayName}. Você já pode interagir com o site.</p>
                    ` : `
                        <i class="fas fa-key text-3xl text-gray-400 mb-4"></i>
                        <h2 class="text-xl font-medium mb-2">Área Exclusiva</h2>
                        <p class="text-gray-600 dark:text-gray-400 mb-6">Use sua chave de acesso para se cadastrar ou faça login para participar.</p>
                        <div class="space-y-3">
                            <button id="open-signup-button" class="w-full py-3 px-4 bg-primary hover:bg-opacity-90 text-white font-semibold rounded-lg">Cadastrar com Chave de Acesso</button>
                            <button id="open-login-button" class="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg">Já tenho conta (Login)</button>
                        </div>
                    `}
                </div>`;
        default:
            return `<div class="text-center p-8"><h2 class="text-2xl font-bold mb-4">Página não encontrada</h2></div>`;
    }
}

export function renderView(viewName, user, weddingDetails) {
    document.getElementById('main-content').innerHTML = generateViewHTML(viewName, user, weddingDetails);
    updateNavButtons(viewName);
}

function updateNavButtons(activeView) {
    document.querySelectorAll('.nav-button').forEach(btn => {
        const isActive = btn.dataset.view === activeView;
        btn.classList.toggle('text-primary', isActive);
        btn.classList.toggle('dark:text-dark-primary', isActive);
        btn.classList.toggle('text-gray-500', !isActive);
        btn.classList.toggle('dark:text-gray-400', !isActive);
    });
}

/**
 * CORREÇÃO: A variável do intervalo agora é armazenada e limpa corretamente.
 * Inicia ou atualiza a contagem regressiva.
 * @param {Date} weddingDate - A data do casamento.
 * @returns {number|null} O ID do intervalo, ou nulo se a data for inválida.
 */
export function updateCountdown(weddingDate) {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return null;

    if (!weddingDate || isNaN(weddingDate.getTime())) {
        countdownEl.innerHTML = `<div class="text-xl font-serif text-gray-500 dark:text-gray-400">Data não disponível</div>`;
        return null;
    }

    const targetTime = weddingDate.getTime();
    let intervalId = null; // Variável para guardar o ID do intervalo

    const update = () => {
        const distance = targetTime - new Date().getTime();
        if (distance < 0) {
            countdownEl.innerHTML = `<div class="text-xl font-serif text-primary dark:text-dark-primary">O grande dia chegou! 🎉</div>`;
            if (intervalId) clearInterval(intervalId); // Limpa o intervalo quando o tempo acaba
            return;
        }
        
        const d = Math.floor(distance / (1000*60*60*24));
        const h = Math.floor((distance % (1000*60*60*24)) / (1000*60*60));
        const m = Math.floor((distance % (1000*60*60)) / (1000*60));
        const s = Math.floor((distance % (1000*60)) / 1000);
        
        countdownEl.innerHTML = `
            <div class="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-16"><div class="text-2xl font-bold text-primary dark:text-dark-primary">${String(d).padStart(2,'0')}</div><div class="text-xs">Dias</div></div>
            <div class="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-16"><div class="text-2xl font-bold text-primary dark:text-dark-primary">${String(h).padStart(2,'0')}</div><div class="text-xs">Horas</div></div>
            <div class="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-16"><div class="text-2xl font-bold text-primary dark:text-dark-primary">${String(m).padStart(2,'0')}</div><div class="text-xs">Min</div></div>
            <div class="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-16"><div class="text-2xl font-bold text-primary dark:text-dark-primary">${String(s).padStart(2,'0')}</div><div class="text-xs">Seg</div></div>
        `;
    };

    update(); // Primeira execução imediata
    intervalId = setInterval(update, 1000); // Inicia o intervalo e guarda o ID
    return intervalId;
}


export function renderGuestPhotos(photos) {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) return;
    
    if (!Array.isArray(photos)) {
        gallery.innerHTML = `<p class="col-span-full text-center text-red-500">Erro ao carregar fotos</p>`;
        return;
    }
    
    if (photos.length === 0) {
        gallery.innerHTML = `<div class="col-span-full text-center py-12"><i class="fas fa-camera text-4xl text-gray-300 mb-4"></i><p class="text-gray-500">Seja o primeiro a compartilhar uma foto!</p></div>`;
    } else {
        gallery.innerHTML = photos.map(photo => `
            <div class="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden group">
                <a href="${photo.imageUrl}" target="_blank" aria-label="Ver foto de ${photo.userName || 'Convidado'} em tamanho real">
                    <img 
                        src="${getOptimizedCloudinaryUrl(photo.imageUrl)}" 
                        alt="Foto de ${photo.userName || 'Convidado'}" 
                        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                        onerror="this.parentElement.innerHTML='<div class=\\'flex items-center justify-center h-full text-gray-400\\'>Erro</div>'"
                    >
                </a>
            </div>
        `).join('');
    }
}

export function renderGuestbookMessages(messages) {
    const container = document.getElementById('guestbook-messages');
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500">Ainda não há mensagens. Seja o primeiro!</p>`;
    } else {
        container.innerHTML = messages.map(msg => `
            <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-4">
                <p class="text-gray-800 dark:text-gray-200">${msg.message}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 text-right mt-2">- ${msg.userName}</p>
            </div>
        `).join('');
    }
}

export function renderGiftList(gifts, currentUser, weddingDetails) {
    const container = document.getElementById('gift-list-container');
    if (!container) return;

    if (gifts.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-500">A nossa lista de presentes está a ser preparada com carinho. Volte em breve!</p>`;
        return;
    }

    container.innerHTML = gifts.map(gift => {
        const isTaken = gift.isTaken;
        const isTakenByMe = isTaken && gift.takenBy === currentUser.displayName;
        const optimizedImageUrl = getOptimizedCloudinaryUrl(gift.imageUrl, 'w_400,h_300,c_fill,q_auto');
        const formattedPrice = gift.price ? `R$ ${Number(gift.price).toFixed(2).replace('.', ',')}` : 'Valor simbólico';

        return `
            <div class="bg-white dark:bg-dark-card border dark:border-gray-700 rounded-lg p-4 flex flex-col justify-between transition-all ${isTaken && !isTakenByMe ? 'opacity-50' : ''}">
                <div>
                    <img src="${optimizedImageUrl}" alt="${gift.name}" class="w-full h-40 object-cover rounded-md mb-4">
                    <h3 class="font-semibold text-gray-800 dark:text-gray-200">${gift.name}</h3>
                    <p class="text-lg font-bold text-primary dark:text-dark-primary mt-2">${formattedPrice}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${gift.description || ''}</p>
                </div>
                <div class="mt-4">
                    ${isTaken 
                        ? (isTakenByMe 
                            ? `<button data-id="${gift.id}" class="unmark-gift-btn w-full py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">Desfazer escolha</button>`
                            : `<div class="text-center text-sm text-green-600 dark:text-green-400 font-semibold p-2 rounded bg-green-50 dark:bg-green-900/50">Presenteado por ${gift.takenBy}</div>`
                          )
                        : `<button 
                                data-id="${gift.id}"
                                data-name="${gift.name}"
                                data-price="${gift.price}"
                                class="present-with-pix-btn w-full py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90">
                                <i class="fas fa-qrcode mr-2"></i>Presentear com PIX
                           </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

function addFormValidation() {
    document.querySelectorAll('input[required], textarea[required]').forEach(input => {
        input.addEventListener('blur', (e) => {
            e.target.classList.toggle('border-red-500', !e.target.validity.valid);
        });
    });
}

function generateGuestNameInputs(count) {
    const container = document.getElementById('guest-names-container');
    if (!container) return;
    container.innerHTML = `<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Por favor, confirme os nomes dos convidados:</label>`;
    for (let i = 0; i < count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'guest-name-input w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600';
        input.placeholder = `Nome do Convidado ${i + 1}`;
        input.required = true;
        container.appendChild(input);
    }
}

export function renderAuthForm(type, accessKey = '', keyData = null) {
    const authFormContainer = document.getElementById('auth-form-container');
    const authModal = document.getElementById('auth-modal');
    if (!authFormContainer || !authModal) return;
    
    authFormContainer.innerHTML = type === 'login' ? `
        <h2 class="text-2xl font-serif mb-4 text-center">Login</h2>
        <form id="login-form" class="space-y-4" novalidate>
            <div><label class="block text-sm">Email</label><input type="email" id="login-email" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <div><label class="block text-sm">Senha</label><input type="password" id="login-password" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <p id="auth-error" class="text-red-500 text-sm hidden"></p>
            <button type="submit" class="w-full py-2 bg-primary text-white rounded">Entrar</button>
            <p class="text-sm text-center">Não tem conta? <button type="button" id="show-signup" class="text-primary font-semibold">Cadastre-se</button></p>
        </form>
        <div class="my-4 flex items-center before:flex-1 before:border-b after:flex-1 after:border-b"><p class="text-center text-xs mx-4">OU</p></div>
        <button id="google-login-modal-button" class="w-full py-2 bg-blue-600 text-white rounded flex items-center justify-center"><i class="fab fa-google mr-2"></i>Entrar com Google</button>
    ` : `
        <h2 class="text-2xl font-serif mb-4 text-center">Cadastro de Convidado</h2>
        <form id="signup-form" class="space-y-4" novalidate>
            <div><label class="block text-sm">Chave de Acesso</label><input type="text" id="signup-key" value="${accessKey}" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required ${accessKey ? 'readonly' : ''}></div>
            <div id="guest-names-container"></div>
            <div class="border-t pt-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Você irá conosco ao restaurante?</label>
                <div class="flex space-x-4 mt-2">
                    <label class="inline-flex items-center"><input type="radio" name="attend-restaurant" value="yes" class="text-primary" checked><span class="ml-2">Sim, irei!</span></label>
                    <label class="inline-flex items-center"><input type="radio" name="attend-restaurant" value="no" class="text-primary"><span class="ml-2">Apenas cerimônia</span></label>
                </div>
            </div>
            <div><label class="block text-sm">Seu Email</label><input type="email" id="signup-email" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <div><label class="block text-sm">Crie uma Senha (mín. 6 caracteres)</label><input type="password" id="signup-password" minlength="6" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <p id="auth-error" class="text-red-500 text-sm hidden"></p>
            <button type="submit" class="w-full py-2 bg-primary text-white rounded">Confirmar e Cadastrar</button>
            <p class="text-sm text-center">Já tem conta? <button type="button" id="show-login" class="text-primary font-semibold">Faça login</button></p>
        </form>
    `;
    
    authModal.classList.remove('hidden');

    if (type === 'signup' && keyData) {
        generateGuestNameInputs(keyData.allowedGuests);
    }
    addFormValidation();
}

export function toggleAuthModal(show) {
    document.getElementById('auth-modal').classList.toggle('hidden', !show);
}

/**
 * Gera o QR Code no placeholder
 * @param {string} pixCode - O código PIX gerado
 */
function generateQRCode(pixCode) {
    const placeholder = document.getElementById('qr-placeholder');
    if (!placeholder) return;

    placeholder.innerHTML = ''; // Limpar o placeholder

    if (window.QRCode) {
        try {
            new window.QRCode(placeholder, {
                text: pixCode,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: window.QRCode.CorrectLevel.M
            });
        } catch (error) {
            console.error("Erro ao gerar QR Code:", error);
            showQRCodeFallback(placeholder);
        }
    } else {
        console.warn("QRCode.js não está disponível");
        showQRCodeFallback(placeholder);
    }
}

/**
 * CORREÇÃO: Removido o `alert()` e melhorado o feedback de erro.
 * Configura o botão de copiar código PIX.
 */
function setupCopyButton() {
    const copyButton = document.getElementById('copy-pix-button');
    const pixInput = document.getElementById('pix-copy-paste');
    
    if (copyButton && pixInput) {
        copyButton.addEventListener('click', async () => {
            const originalIcon = copyButton.innerHTML;
            try {
                await navigator.clipboard.writeText(pixInput.value);
                
                // Feedback visual de sucesso
                copyButton.innerHTML = '<i class="fas fa-check text-green-600"></i>';
                copyButton.classList.add('bg-green-200', 'dark:bg-green-800');
                
                setTimeout(() => {
                    copyButton.innerHTML = originalIcon;
                    copyButton.classList.remove('bg-green-200', 'dark:bg-green-800');
                }, 2000);
                
            } catch (error) {
                console.error('Erro ao copiar:', error);
                
                // Feedback visual de erro, sem usar alert()
                copyButton.innerHTML = '<i class="fas fa-times text-red-600"></i>';
                copyButton.classList.add('bg-red-200', 'dark:bg-red-800');

                // Tenta o método antigo como fallback
                try {
                    pixInput.select();
                    document.execCommand('copy');
                } catch (fallbackError) {
                    console.error('Erro no fallback de cópia:', fallbackError);
                }

                setTimeout(() => {
                    copyButton.innerHTML = originalIcon;
                    copyButton.classList.remove('bg-red-200', 'dark:bg-red-800');
                }, 2000);
            }
        });
    }
}


/**
 * Mostra um fallback quando o QR Code não pode ser gerado
 * @param {HTMLElement} placeholder - O elemento onde mostrar o fallback
 */
function showQRCodeFallback(placeholder) {
    placeholder.innerHTML = `
        <div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-8 text-center">
            <i class="fas fa-qrcode text-4xl text-gray-500 mb-2"></i>
            <p class="text-sm text-gray-600 dark:text-gray-400">QR Code indisponível</p>
            <p class="text-xs text-gray-500 mt-1">Use o código PIX abaixo</p>
        </div>
    `;
}

/**
 * Renderiza o modal de pagamento PIX.
 * @param {object} gift - O objeto do presente { id, name, price }.
 * @param {object} weddingDetails - Detalhes do casamento, incluindo a chave PIX.
 */
export function renderPixModal(gift, weddingDetails) {
    const pixContainer = document.getElementById('pix-content-container');
    if (!pixContainer || !weddingDetails.pixKey) {
        // CORREÇÃO: Evita `alert` e mostra o erro de forma mais elegante.
        showToast('A chave PIX dos noivos não foi configurada.', 'error');
        return;
    }

    pixContainer.innerHTML = `<div class="flex justify-center items-center p-10"><i class="fas fa-spinner fa-spin text-3xl text-primary"></i></div>`;
    togglePixModal(true);

    try {
        // Gerar o código PIX
        const pixCode = generatePixCode(
            weddingDetails.pixKey,
            weddingDetails.coupleNames,
            'SALVADOR', // Cidade do recebedor
            parseFloat(gift.price),
            `GIFT-${gift.id}` // ID da transação
        );

        // Renderizar o conteúdo do modal
        pixContainer.innerHTML = `
            <div class="text-center">
                <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Presentear com PIX</h2>
                <p class="text-gray-600 dark:text-gray-400 mb-4">Você está a presentear com: <strong>${gift.name}</strong></p>
                
                <div id="qr-placeholder" class="flex justify-center p-4 bg-white rounded-lg mx-auto mb-4 w-fit"></div>
                
                <p class="text-lg font-bold text-primary dark:text-dark-primary mt-4">Valor: R$ ${parseFloat(gift.price).toFixed(2).replace('.', ',')}</p>
                
                <div class="mt-6">
                    <p class="text-sm font-medium mb-2">1. Abra a app do seu banco e aponte a câmara para o QR Code.</p>
                    <p class="text-sm font-medium mb-4">2. Ou use o PIX Copia e Cola abaixo:</p>
                    <div class="flex items-center">
                        <input id="pix-copy-paste" type="text" readonly value="${pixCode}" class="w-full p-2 text-xs bg-gray-200 dark:bg-gray-800 border rounded-l-md">
                        <button id="copy-pix-button" class="bg-gray-300 dark:bg-gray-700 px-4 py-2 border-y border-r rounded-r-md hover:bg-gray-400"><i class="fas fa-copy"></i></button>
                    </div>
                </div>
                
                <div class="mt-8 border-t dark:border-gray-700 pt-4">
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Após realizar o pagamento no seu banco, clique no botão abaixo para confirmar o seu presente.</p>
                    <button id="confirm-gift-button" data-id="${gift.id}" class="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">
                        <i class="fas fa-check-circle mr-2"></i>Já fiz o PIX, confirmar presente!
                    </button>
                </div>
            </div>`;

        // Aguardar um momento para o DOM ser atualizado e então gerar o QR Code
        setTimeout(() => {
            generateQRCode(pixCode);
            setupCopyButton();
        }, 100);

    } catch (error) {
        console.error("Erro ao gerar PIX:", error);
        pixContainer.innerHTML = `
            <div class="text-center p-8">
                <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                <p class="text-red-500 font-medium">Ocorreu um erro ao gerar o código PIX.</p>
                <p class="text-gray-600 dark:text-gray-400 text-sm mt-2">Por favor, tente novamente.</p>
            </div>`;
    }
}


/**
 * CORREÇÃO: Simplificada para maior compatibilidade. Removido o campo de mensagem não padrão.
 * Gera uma string de PIX Copia e Cola (BR Code)
 * @param {string} pixKey - A chave PIX (CPF, CNPJ, email, telefone ou chave aleatória).
 * @param {string} name - Nome do recebedor (até 25 caracteres).
 * @param {string} city - Cidade do recebedor (até 15 caracteres).
 * @param {number} value - O valor da transação.
 * @param {string} transactionId - Um ID único para a transação (até 25 caracteres).
 * @returns {string} O código PIX completo.
 */
function generatePixCode(pixKey, name, city, value, transactionId) {
    // Função para calcular o CRC16 (validação do código PIX)
    function crc16(data) {
        let crc = 0xFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) { 
                    crc = (crc << 1) ^ 0x1021; 
                } else { 
                    crc <<= 1; 
                }
                crc &= 0xFFFF;
            }
        }
        return crc.toString(16).toUpperCase().padStart(4, '0');
    }

    // Função para formatar um campo no padrão Tag-Length-Value (TLV)
    function formatField(id, value) {
        const length = value.length.toString().padStart(2, '0');
        return id + length + value;
    }

    // Normaliza e trunca os dados para garantir que se encaixem nos limites do PIX
    const sanitizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 25);
    const sanitizedCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 15);
    const sanitizedTxId = (transactionId || '***').replace(/\s/g, '').substring(0, 25);

    let pixString = '';
    pixString += formatField('00', '01'); // Payload Format Indicator
    
    // Merchant Account Information (Informações da Conta)
    let merchantInfo = formatField('00', 'BR.GOV.BCB.PIX') + formatField('01', pixKey);
    pixString += formatField('26', merchantInfo);
    
    pixString += formatField('52', '0000'); // Merchant Category Code (sempre 0000)
    pixString += formatField('53', '986');  // Transaction Currency (BRL - Real Brasileiro)
    
    // Transaction Amount (Valor)
    if (value && value > 0) { 
        pixString += formatField('54', value.toFixed(2)); 
    }
    
    pixString += formatField('58', 'BR'); // Country Code (Brasil)
    pixString += formatField('59', sanitizedName); // Merchant Name (Nome do Recebedor)
    pixString += formatField('60', sanitizedCity); // Merchant City (Cidade do Recebedor)
    
    // Additional Data Field (Campo de Dados Adicionais com o ID da Transação)
    let additionalData = formatField('05', sanitizedTxId);
    pixString += formatField('62', additionalData);
    
    // CRC16 (Checksum de Validação)
    pixString += '6304';
    const crc = crc16(pixString);
    pixString += crc;
    
    return pixString;
}


export function togglePixModal(show) {
    const pixModal = document.getElementById('pix-modal');
    pixModal.classList.toggle('hidden', !show);
}

/**
 * MELHORIA: Usa delegação de eventos para gerenciar os cliques nos botões de presente.
 * Isso é mais eficiente do que adicionar um listener para cada botão individualmente.
 * @param {object} weddingDetails - Os detalhes do casamento.
 */
export function initializeGiftEventListeners(weddingDetails) {
    const container = document.getElementById('gift-list-container');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const pixButton = e.target.closest('.present-with-pix-btn');
        if (pixButton) {
            const gift = {
                id: pixButton.dataset.id,
                name: pixButton.dataset.name,
                price: parseFloat(pixButton.dataset.price)
            };
            renderPixModal(gift, weddingDetails);
        }
    });
}
