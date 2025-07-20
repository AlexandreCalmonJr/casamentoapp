// js/ui.js

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

    // Função auxiliar para formatar data com fallback
    const formatDate = (date) => {
        try {
            return date.toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        } catch (error) {
            return 'Data não disponível';
        }
    };

    const formatTime = (date) => {
        try {
            return date.toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (error) {
            return 'Horário não disponível';
        }
    };

    switch (viewName) {
        case 'home':
            return `
                <div class="space-y-8 text-center">
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-8">
                        <h1 class="text-5xl font-cursive text-primary dark:text-dark-primary mb-4">
                            ${weddingDetails.coupleNames || 'Nosso Casamento'}
                        </h1>
                        <p class="text-gray-600 dark:text-gray-400">
                            Temos a honra de convidar para a celebração do nosso amor!
                        </p>
                    </div>
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">
                        <h2 class="text-xl font-medium mb-4">Contagem Regressiva</h2>
                        <div id="countdown" class="flex justify-center space-x-2 md:space-x-4">
                            <div class="text-gray-500">Carregando...</div>
                        </div>
                    </div>
                </div>`;
        
        case 'details':
            return `
                <div class="space-y-6">
                    <div class="text-center">
                        <h1 class="text-3xl font-cursive mb-2">Detalhes do Evento</h1>
                    </div>
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6 space-y-4">
                        <h3 class="text-lg font-semibold border-b pb-2 mb-3">Cerimônia</h3>
                        <div class="flex items-center">
                            <i class="fas fa-calendar-alt fa-fw mr-3 text-primary dark:text-dark-primary"></i>
                            <span>${formatDate(weddingDetails.weddingDate)}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-clock fa-fw mr-3 text-primary dark:text-dark-primary"></i>
                            <span>${formatTime(weddingDetails.weddingDate)}h</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-map-marker-alt fa-fw mr-3 text-primary dark:text-dark-primary"></i>
                            <span>${weddingDetails.venue || 'Local a ser definido'}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-user-tie fa-fw mr-3 text-primary dark:text-dark-primary"></i>
                            <span>Traje: ${weddingDetails.dressCode || 'A definir'}</span>
                        </div>
                    </div>
                    ${weddingDetails.restaurantName ? `
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6 space-y-4">
                        <h3 class="text-lg font-semibold border-b pb-2 mb-3">Comemoração Pós-Cerimônia</h3>
                        <div class="flex items-center">
                            <i class="fas fa-utensils fa-fw mr-3 text-primary dark:text-dark-primary"></i>
                            <span>${weddingDetails.restaurantName}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-map-pin fa-fw mr-3 text-primary dark:text-dark-primary"></i>
                            <span>${weddingDetails.restaurantAddress || 'Endereço a ser definido'}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-dollar-sign fa-fw mr-3 text-primary dark:text-dark-primary"></i>
                            <span>${weddingDetails.restaurantPriceInfo || 'Valores a confirmar'}</span>
                        </div>
                        ${weddingDetails.restaurantMapsLink ? `
                        <a href="${weddingDetails.restaurantMapsLink}" target="_blank" class="block w-full text-center mt-4 py-2 px-4 bg-primary text-white font-medium rounded-lg">
                            Ver no Google Maps
                        </a>` : ''}
                    </div>
                    ` : ''}
                </div>`;
        
        case 'guest-photos':
            return `
                <div class="space-y-6">
                    <div class="text-center"><h1 class="text-3xl font-cursive mb-2">Galeria dos Convidados</h1></div>
                    ${user ? `
                        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">
                            <div class="text-center mb-6">
                                <p class="mb-2">Olá, ${user.displayName}! Compartilhe seus registros.</p>
                            </div>
                            <div class="flex flex-col sm:flex-row items-center gap-4">
                                <input type="file" id="photo-input" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 dark:file:bg-dark-primary/20 dark:file:text-dark-primary"/>
                                <button id="upload-button" class="bg-primary text-white px-4 py-2 rounded-lg w-full sm:w-auto flex-shrink-0"><i class="fas fa-upload mr-2"></i>Enviar</button>
                            </div>
                            <div id="upload-progress-container" class="mt-4 hidden"><div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"><div id="progress-bar" class="bg-primary h-2.5 rounded-full" style="width: 0%"></div></div></div>
                            <p id="upload-error" class="text-red-500 text-sm mt-2 hidden"></p>
                        </div>
                        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">
                            <h2 class="text-xl font-medium mb-4 flex items-center"><i class="fas fa-camera-retro text-primary dark:text-dark-primary mr-2"></i>Caça ao Tesouro Fotográfica!</h2>
                            <p class="text-gray-600 dark:text-gray-400 mb-4">Ajude-nos a registrar todos os momentos! Tente capturar:</p>
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
            return `
                <div class="text-center p-8">
                    <h2 class="text-2xl font-bold mb-4">Página não encontrada</h2>
                    <p class="text-gray-600 dark:text-gray-400">A página que você está procurando não existe.</p>
                </div>`;
    }
}

/**
 * Renderiza uma view no container principal.
 */
export function renderView(viewName, user, weddingDetails) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = generateViewHTML(viewName, user, weddingDetails);
    updateNavButtons(viewName);
}

/**
 * Atualiza o estado visual dos botões de navegação.
 */
function updateNavButtons(activeView) {
    const navButtons = document.querySelectorAll('.nav-button');
    navButtons.forEach(btn => {
        const isActive = btn.dataset.view === activeView;
        btn.classList.toggle('text-primary', isActive);
        btn.classList.toggle('dark:text-dark-primary', isActive);
        btn.classList.toggle('text-gray-500', !isActive);
        btn.classList.toggle('dark:text-gray-400', !isActive);
    });
}

/**
 * Atualiza o timer de contagem regressiva com tratamento de erro.
 */
export function updateCountdown(weddingDate) {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return null;

    if (!weddingDate || !(weddingDate instanceof Date) || isNaN(weddingDate.getTime())) {
        countdownEl.innerHTML = `<div class="text-xl font-serif text-gray-500 dark:text-gray-400">Data do evento não disponível</div>`;
        return null;
    }

    const targetTime = weddingDate.getTime();
    
    const updateTimer = () => {
        const distance = targetTime - new Date().getTime();
        
        if (distance < 0) {
            countdownEl.innerHTML = `<div class="text-xl font-serif text-primary dark:text-dark-primary">O grande dia chegou! 🎉</div>`;
            return false;
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
        return true;
    };

    if (!updateTimer()) return null;
    
    const interval = setInterval(() => {
        if (!updateTimer()) {
            clearInterval(interval);
        }
    }, 1000);
    
    return interval;
}

/**
 * Renderiza as fotos na galeria com loading e erro.
 */
export function renderGuestPhotos(photos) {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) return;
    
    if (!Array.isArray(photos)) {
        gallery.innerHTML = `<p class="col-span-full text-center text-red-500">Erro ao carregar fotos</p>`;
        return;
    }
    
    if (photos.length === 0) {
        gallery.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-camera text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">Seja o primeiro a compartilhar uma foto!</p>
            </div>`;
    } else {
        gallery.innerHTML = photos.map(photo => `
            <div class="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden group">
                <img 
                    src="${photo.imageUrl}" 
                    alt="Foto de ${photo.userName || 'Convidado'}" 
                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                    onerror="this.parentElement.innerHTML='<div class=\\'flex items-center justify-center h-full text-gray-400\\'>Erro ao carregar</div>'"
                >
            </div>
        `).join('');
    }
}

/**
 * Renderiza as mensagens no mural de recados.
 */
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

/**
 * Renderiza a lista de presentes.
 */
export function renderGiftList(gifts, currentUser) {
    const container = document.getElementById('gift-list-container');
    if (!container) return;

    if (gifts.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-500">Nossa lista de presentes está sendo preparada com carinho. Volte em breve!</p>`;
        return;
    }

    container.innerHTML = gifts.map(gift => {
        const isTaken = gift.isTaken;
        const isTakenByMe = isTaken && gift.takenBy === currentUser.displayName;

        return `
            <div class="bg-white dark:bg-dark-card border dark:border-gray-700 rounded-lg p-4 flex flex-col justify-between transition-all ${isTaken && !isTakenByMe ? 'opacity-50' : ''}">
                <div>
                    <img src="${gift.imageUrl || 'https://placehold.co/400x300/EEE/31343C?text=Presente'}" alt="${gift.name}" class="w-full h-40 object-cover rounded-md mb-4">
                    <h3 class="font-semibold text-gray-800 dark:text-gray-200">${gift.name}</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${gift.description}</p>
                </div>
                <div class="mt-4">
                    ${isTaken 
                        ? (isTakenByMe 
                            ? `<button data-id="${gift.id}" class="unmark-gift-btn w-full py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">Desfazer escolha</button>`
                            : `<div class="text-center text-sm text-green-600 dark:text-green-400 font-semibold p-2 rounded bg-green-50 dark:bg-green-900/50">Presenteado por ${gift.takenBy}</div>`
                          )
                        : `<button data-id="${gift.id}" class="mark-gift-btn w-full py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90">Quero presentear</button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Adiciona validação em tempo real aos campos do formulário de cadastro.
 */
function addFormValidation() {
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');
    const guestInputs = document.querySelectorAll('.guest-name-input');
    
    if (emailInput) {
        emailInput.addEventListener('blur', (e) => {
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value);
            e.target.classList.toggle('border-red-500', !isValid && e.target.value);
            e.target.classList.toggle('border-green-500', isValid);
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const isValid = e.target.value.length >= 6;
            e.target.classList.toggle('border-red-500', !isValid && e.target.value);
            e.target.classList.toggle('border-green-500', isValid);
        });
    }
    
    guestInputs.forEach(input => {
        input.addEventListener('blur', (e) => {
            const isValid = e.target.value.trim().length >= 2;
            e.target.classList.toggle('border-red-500', !isValid && e.target.value);
            e.target.classList.toggle('border-green-500', isValid);
        });
    });
}

/**
 * Gera os campos de input para os nomes dos convidados.
 */
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

/**
 * Renderiza o formulário de autenticação no modal.
 */
export function renderAuthForm(type, accessKey = '', keyData = null) {
    const authFormContainer = document.getElementById('auth-form-container');
    const authModal = document.getElementById('auth-modal');

    if (!authFormContainer || !authModal) {
        console.error('Elementos do modal de auth não encontrados');
        return;
    }
    
    authFormContainer.innerHTML = type === 'login' ? `
        <h2 class="text-2xl font-serif mb-4 text-center">Login</h2>
        <form id="login-form" class="space-y-4">
            <div><label class="block text-sm">Email</label><input type="email" id="login-email" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <div><label class="block text-sm">Senha</label><input type="password" id="login-password" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <p id="auth-error" class="text-red-500 text-sm hidden"></p>
            <button type="submit" class="w-full py-2 bg-primary text-white rounded">Entrar</button>
            <p class="text-sm text-center">Não tem conta? <button type="button" id="show-signup" class="text-primary font-semibold">Cadastre-se com uma chave</button></p>
        </form>
        <div class="my-4 flex items-center before:flex-1 before:border-b after:flex-1 after:border-b"><p class="text-center text-xs mx-4">OU</p></div>
        <button id="google-login-modal-button" class="w-full py-2 bg-blue-600 text-white rounded flex items-center justify-center"><i class="fab fa-google mr-2"></i>Entrar com Google</button>
    ` : `
        <h2 class="text-2xl font-serif mb-4 text-center">Cadastro de Convidado</h2>
        <form id="signup-form" class="space-y-4">
            <div><label class="block text-sm">Chave de Acesso</label><input type="text" id="signup-key" value="${accessKey}" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required ${accessKey ? 'readonly' : ''}></div>
            <div id="guest-names-container"></div>
            <div class="border-t pt-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Você irá conosco ao restaurante após a cerimônia?</label>
                <div class="flex space-x-4 mt-2">
                    <label class="inline-flex items-center"><input type="radio" name="attend-restaurant" value="yes" class="text-primary" checked><span class="ml-2">Sim, irei!</span></label>
                    <label class="inline-flex items-center"><input type="radio" name="attend-restaurant" value="no" class="text-primary"><span class="ml-2">Apenas cerimônia</span></label>
                </div>
            </div>
            <div><label class="block text-sm">Seu Email</label><input type="email" id="signup-email" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <div><label class="block text-sm">Crie uma Senha</label><input type="password" id="signup-password" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <p id="auth-error" class="text-red-500 text-sm hidden"></p>
            <button type="submit" class="w-full py-2 bg-primary text-white rounded">Confirmar Presença e Cadastrar</button>
            <p class="text-sm text-center">Já tem conta? <button type="button" id="show-login" class="text-primary font-semibold">Faça login</button></p>
        </form>
    `;
    
    authModal.classList.remove('hidden');

    if (type === 'signup' && keyData) {
        generateGuestNameInputs(keyData.allowedGuests);
        setTimeout(() => addFormValidation(), 100);
    }
}

/**
 * Mostra ou esconde o modal de autenticação.
 */
export function toggleAuthModal(show) {
    const authModal = document.getElementById('auth-modal');
    authModal.classList.toggle('hidden', !show);
}
