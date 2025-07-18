// js/ui.js

// Seletores da DOM
const mainContent = document.getElementById('main-content');
const authModal = document.getElementById('auth-modal');
const authFormContainer = document.getElementById('auth-form-container');
const navButtons = document.querySelectorAll('.nav-button');

/**
 * Gera o HTML para uma view específica.
 * @param {string} viewName - O nome da view ('home', 'details', etc.).
 * @param {firebase.User|null} user - O usuário autenticado.
 * @param {Object} weddingDetails - Os detalhes do casamento vindos do Firestore.
 * @returns {string} - O HTML da view.
 */
export function generateViewHTML(viewName, user, weddingDetails) {
    if (!weddingDetails) {
        return `<div class="text-center p-8">Carregando detalhes do evento...</div>`;
    }

    switch (viewName) {
        case 'home':
            return `
                <div class="space-y-8 text-center">
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-8">
                        <h1 class="text-5xl font-cursive text-primary dark:text-dark-primary mb-4">${weddingDetails.coupleNames}</h1>
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
                        <div class="flex items-center"><i class="fas fa-calendar-alt fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.weddingDate.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                        <div class="flex items-center"><i class="fas fa-clock fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.weddingDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h</span></div>
                        <div class="flex items-center"><i class="fas fa-map-marker-alt fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.venue}</span></div>
                        <div class="flex items-center"><i class="fas fa-user-tie fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>Traje: ${weddingDetails.dressCode}</span></div>
                    </div>
                </div>`;
        case 'guest-photos':
            return `
                <div class="space-y-6">
                    <div class="text-center"><h1 class="text-3xl font-cursive mb-2">Galeria dos Convidados</h1></div>
                    <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">
                        ${user ? `
                            <div class="text-center mb-6">
                                <p class="mb-2">Olá, ${user.displayName}! Compartilhe seus registros.</p>
                                <button id="logout-button" class="text-sm text-red-500 hover:underline">Sair</button>
                            </div>
                            <div class="flex flex-col sm:flex-row items-center gap-4">
                                <input type="file" id="photo-input" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 dark:file:bg-dark-primary/20 dark:file:text-dark-primary"/>
                                <button id="upload-button" class="bg-primary text-white px-4 py-2 rounded-lg w-full sm:w-auto flex-shrink-0"><i class="fas fa-upload mr-2"></i>Enviar</button>
                            </div>
                            <div id="upload-progress-container" class="mt-4 hidden"><div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"><div id="progress-bar" class="bg-primary h-2.5 rounded-full" style="width: 0%"></div></div></div>
                            <p id="upload-error" class="text-red-500 text-sm mt-2 hidden"></p>
                        ` : `
                            <div class="text-center">
                                <p class="mb-4">Para enviar fotos e ver a galeria, por favor, acesse com sua chave.</p>
                                <button id="open-auth-button" class="w-full py-2 px-4 bg-primary hover:bg-opacity-90 text-white font-medium rounded-lg">Login / Cadastro com Chave</button>
                            </div>
                        `}
                    </div>
                    <div id="photo-gallery" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"></div>
                </div>`;
        case 'rsvp':
            const rsvpDateFormatted = weddingDetails.rsvpDate.toLocaleDateString('pt-BR', { month: 'long', day: 'numeric' });
            return `
                <div class="text-center"><h1 class="text-3xl font-cursive mb-2">Confirme sua Presença</h1></div>
                <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6 max-w-lg mx-auto">
                    <form id="rsvp-form" class="space-y-4">
                        <p class="text-center text-gray-600 dark:text-gray-400">Por favor, responda até ${rsvpDateFormatted}.</p>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
                            <input type="text" class="w-full mt-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800" required>
                        </div>
                        <button type="submit" class="w-full py-3 px-4 bg-primary hover:bg-opacity-90 text-white font-semibold rounded-lg">Enviar Confirmação</button>
                    </form>
                </div>`;
        default:
            return `<p>Página não encontrada.</p>`;
    }
}

/**
 * Renderiza uma view no container principal.
 * @param {string} viewName - O nome da view.
 * @param {firebase.User|null} user - O usuário autenticado.
 * @param {Object} weddingDetails - Os detalhes do casamento.
 */
export function renderView(viewName, user, weddingDetails) {
    mainContent.innerHTML = generateViewHTML(viewName, user, weddingDetails);
    updateNavButtons(viewName);
}

/**
 * Atualiza o estado visual dos botões de navegação.
 * @param {string} activeView - A view que está ativa.
 */
function updateNavButtons(activeView) {
    navButtons.forEach(btn => {
        const isActive = btn.dataset.view === activeView;
        btn.classList.toggle('text-primary', isActive);
        btn.classList.toggle('dark:text-dark-primary', isActive);
        btn.classList.toggle('text-gray-500', !isActive);
        btn.classList.toggle('dark:text-gray-400', !isActive);
    });
}

/**
 * Atualiza o timer de contagem regressiva.
 * @param {Date} weddingDate - O objeto Date da data do casamento.
 */
export function updateCountdown(weddingDate) {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return null;

    const targetTime = weddingDate.getTime();
    const interval = setInterval(() => {
        const distance = targetTime - new Date().getTime();
        if (distance < 0) {
            clearInterval(interval);
            countdownEl.innerHTML = `<div class="text-xl font-serif text-primary dark:text-dark-primary">O grande dia chegou!</div>`;
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
    }, 1000);
    return interval;
}

/**
 * Renderiza o formulário de autenticação no modal.
 * @param {string} type - 'login' ou 'signup'.
 * @param {string} accessKey - Chave de acesso (opcional).
 */
export function renderAuthForm(type, accessKey = '') {
    authFormContainer.innerHTML = type === 'login' ? `
        <h2 class="text-2xl font-serif mb-4 text-center">Login</h2>
        <form id="login-form" class="space-y-4">
            <div><label class="block text-sm">Email</label><input type="email" id="login-email" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <div><label class="block text-sm">Senha</label><input type="password" id="login-password" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <p id="auth-error" class="text-red-500 text-sm hidden"></p>
            <button type="submit" class="w-full py-2 bg-primary text-white rounded">Entrar</button>
            <p class="text-sm text-center">Não tem conta? <button type="button" id="show-signup" class="text-primary font-semibold">Cadastre-se com uma chave</button></p>
        </form>
    ` : `
        <h2 class="text-2xl font-serif mb-4 text-center">Cadastro de Convidado</h2>
        <form id="signup-form" class="space-y-4">
            <div><label class="block text-sm">Chave de Acesso</label><input type="text" id="signup-key" value="${accessKey}" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required ${accessKey ? 'readonly' : ''}></div>
            <div><label class="block text-sm">Seu Nome</label><input type="text" id="signup-name" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <div><label class="block text-sm">Email</label><input type="email" id="signup-email" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <div><label class="block text-sm">Crie uma Senha</label><input type="password" id="signup-password" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div>
            <p id="auth-error" class="text-red-500 text-sm hidden"></p>
            <button type="submit" class="w-full py-2 bg-primary text-white rounded">Cadastrar</button>
            <p class="text-sm text-center">Já tem conta? <button type="button" id="show-login" class="text-primary font-semibold">Faça login</button></p>
        </form>
    `;
    authModal.classList.remove('hidden');
}

/**
 * Renderiza as fotos na galeria.
 * @param {Array<Object>} photos - A lista de objetos de foto.
 */
export function renderGuestPhotos(photos) {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) return;
    
    if (photos.length === 0) {
        gallery.innerHTML = `<p class="col-span-full text-center text-gray-500">Seja o primeiro a compartilhar uma foto!</p>`;
    } else {
        gallery.innerHTML = photos.map(photo => `
            <div class="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                <img src="${photo.imageUrl}" alt="Foto de ${photo.userName}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-110">
            </div>
        `).join('');
    }
}

/**
 * Mostra ou esconde o modal de autenticação.
 * @param {boolean} show - True para mostrar, false para esconder.
 */
export function toggleAuthModal(show) {
    authModal.classList.toggle('hidden', !show);
}
