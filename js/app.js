// js/app.js

import { adminEmails } from './config.js';
import * as Firebase from './firebase-service.js';
import * as UI from './ui.js';

const appState = {
    currentView: 'home',
    currentUser: null,
    accessKeyInfo: null,
    countdownInterval: null,
    galleryUnsubscribe: null,
    guestbookUnsubscribe: null,
    giftListUnsubscribe: null,
    weddingDetails: null
};

// --- Funções de Ajuda e Utilitários ---

function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true' ||
        (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
    }
    document.getElementById('toggle-dark-mode')?.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', isDark.toString());
    });
}

function cleanupListeners() {
    if (appState.galleryUnsubscribe) appState.galleryUnsubscribe();
    if (appState.guestbookUnsubscribe) appState.guestbookUnsubscribe();
    if (appState.giftListUnsubscribe) appState.giftListUnsubscribe();
    if (appState.countdownInterval) clearInterval(appState.countdownInterval);
    appState.galleryUnsubscribe = null;
    appState.guestbookUnsubscribe = null;
    appState.giftListUnsubscribe = null;
    appState.countdownInterval = null;
}

async function handleAccessKeyValidation(key) {
    try {
        return await Firebase.validateAccessKey(key);
    } catch (error) {
        console.error('Erro ao validar chave:', error);
        UI.showToast('Ocorreu um erro ao validar a chave de acesso.', 'error');
        return { isValid: false, isUsed: false, data: null };
    }
}

// --- Funções de Manipulação de Eventos ---
function handleNavigation(event) {
    const view = event.currentTarget.dataset.view;
    if (view) {
        window.history.pushState({ view }, '', `#${view}`);
        appState.currentView = view;
        renderCurrentView();
    }
}

function handleAuthFormSwitch(event) {
    const targetForm = event.target.id === 'show-signup' ? 'signup' : 'login';
    UI.renderAuthForm(targetForm, appState.accessKeyInfo?.key, appState.accessKeyInfo?.data);
    setupAuthFormListeners();
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    UI.setButtonLoading(button, true);
    try {
        await Firebase.loginUser(email, password);
        UI.showToast('Login efetuado com sucesso!', 'success');
    } catch (error) {
        UI.showToast('Email ou senha inválidos. Tente novamente.', 'error');
    } finally {
        UI.setButtonLoading(button, false);
    }
}

async function handleSignupSubmit(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const key = document.getElementById('signup-key').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    
    if (!key || !email || password.length < 6) {
        UI.showToast('Por favor, verifique todos os campos obrigatórios.', 'error');
        return;
    }
    const guestNameInputs = document.querySelectorAll('.guest-name-input');
    const guestNames = Array.from(guestNameInputs).map(input => input.value.trim()).filter(name => name);
    if (guestNames.length === 0) {
        UI.showToast('Pelo menos um nome de convidado é obrigatório.', 'error');
        return;
    }

    UI.setButtonLoading(button, true);

    try {
        const { isValid, isUsed, docId, data } = await handleAccessKeyValidation(key);
        if (!isValid || isUsed) {
            UI.showToast(isUsed ? "Esta chave de acesso já foi utilizada." : "Chave de acesso inválida.", 'error');
            UI.setButtonLoading(button, false);
            return;
        }
        const mainGuestName = guestNames[0];
        const willAttendRestaurant = document.querySelector('input[name="attend-restaurant"]:checked')?.value === 'yes';
        await Firebase.signupUser({
            name: mainGuestName,
            email: email,
            password: password,
            keyDocId: docId,
            guestNames: guestNames,
            willAttendRestaurant: willAttendRestaurant
        });
        UI.showToast(`Bem-vindo(a), ${mainGuestName}! Cadastro realizado.`, 'success');
    } catch (error) {
        console.error('Erro no cadastro:', error);
        const message = error.code === 'auth/email-already-in-use' 
            ? "Este email já está cadastrado." 
            : "Erro ao criar a conta. Verifique os dados.";
        UI.showToast(message, 'error');
    } finally {
        UI.setButtonLoading(button, false);
    }
}

// CORRIGIDO: Chama as funções específicas do Firebase
async function handleSocialLogin(provider, button) {
    UI.setButtonLoading(button, true);
    try {
        switch (provider) {
            case 'google': await Firebase.signInWithGoogle(); break;
            case 'facebook': await Firebase.signInWithFacebook(); break;
            case 'apple': await Firebase.signInWithApple(); break;
        }
        UI.showToast(`Login com ${provider} bem-sucedido!`, 'success');
    } catch (error) {
        console.error(`${provider} Sign-In Error:`, error);
        UI.showToast(`Erro ao fazer login com ${provider}.`, 'error');
    } finally {
        UI.setButtonLoading(button, false);
    }
}

// CORRIGIDO: Chama as funções específicas do Firebase
async function handleSocialSignup(provider, button) {
    const key = document.getElementById('signup-key')?.value.trim();
    if (!key) {
        UI.showToast("Por favor, insira sua chave de acesso antes de usar o cadastro rápido.", 'info');
        return;
    }

    UI.setButtonLoading(button, true);
    
    try {
        const { isValid, isUsed, docId, data } = await handleAccessKeyValidation(key);
        if (!isValid || isUsed) {
            UI.showToast(isUsed ? "Esta chave já foi utilizada." : "Chave de acesso inválida.", 'error');
            UI.setButtonLoading(button, false);
            return;
        }
        
        let result;
        switch (provider) {
            case 'google': result = await Firebase.signInWithGoogle(); break;
            case 'facebook': result = await Firebase.signInWithFacebook(); break;
            case 'apple': result = await Firebase.signInWithApple(); break;
        }
        const user = result.user;

        UI.showSocialSignupModal(data, async ({ guestNames, willAttendRestaurant }) => {
            try {
                await Firebase.signupUser({
                    name: user.displayName || guestNames[0],
                    email: user.email,
                    password: null, 
                    keyDocId: docId,
                    guestNames: guestNames,
                    willAttendRestaurant: willAttendRestaurant,
                    socialProvider: provider,
                    user: user
                });
                UI.showToast(`Bem-vindo(a), ${user.displayName}! Cadastro concluído.`, 'success');
            } catch (signupError) {
                console.error(`Erro no cadastro com ${provider}:`, signupError);
                UI.showToast(`Erro ao finalizar cadastro com ${provider}.`, 'error');
            }
        });
        
    } catch (error) {
        console.error(`Erro no cadastro com ${provider}:`, error);
        UI.showToast(`Erro ao iniciar cadastro com ${provider}.`, 'error');
    } finally {
        UI.setButtonLoading(button, false);
    }
}


async function handlePhotoUploadClick() {
    const fileInput = document.getElementById('photo-input');
    const uploadBtn = document.getElementById('upload-button');
    const file = fileInput.files[0];
    const user = appState.currentUser;
    if (!file || !user) return;
    
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('progress-bar');
    progressContainer.classList.remove('hidden');
    UI.setButtonLoading(uploadBtn, true);
    try {
        await Firebase.uploadPhoto(file, user, (progress) => {
            progressBar.style.width = `${progress}%`;
        });
        fileInput.value = '';
        UI.showToast('Foto enviada com sucesso!', 'success');
    } catch (error) {
        UI.showToast('Erro no upload. Tente novamente.', 'error');
    } finally {
        UI.setButtonLoading(uploadBtn, false);
        setTimeout(() => progressContainer.classList.add('hidden'), 1000);
    }
}

async function handleGuestbookSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    const messageInput = document.getElementById('guestbook-message');
    const message = messageInput.value.trim();
    const user = appState.currentUser;
    if (!message || !user) return;

    UI.setButtonLoading(button, true);
    try {
        await Firebase.postGuestbookMessage(user, message);
        messageInput.value = '';
        UI.showToast('Sua mensagem foi enviada!', 'success');
    } catch (error) {
        UI.showToast('Erro ao enviar mensagem.', 'error');
    } finally {
        UI.setButtonLoading(button, false);
    }
}

async function handleRsvpUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    UI.setButtonLoading(button, true);

    const guestNameInputs = form.querySelectorAll('.guest-name-input');
    const guestNames = Array.from(guestNameInputs).map(input => input.value.trim()).filter(name => name);
    const willAttendRestaurant = form.querySelector('input[name="attend-restaurant-update"]:checked')?.value === 'yes';

    if (guestNames.length === 0) {
        UI.showToast('Pelo menos um nome de convidado é necessário.', 'error');
        UI.setButtonLoading(button, false);
        return;
    }

    try {
        await Firebase.updateRsvpDetails(appState.accessKeyInfo.key, {
            guestNames,
            willAttendRestaurant
        });
        UI.showToast('Confirmação atualizada com sucesso!', 'success');
        UI.toggleRsvpModal(false);
    } catch (error) {
        console.error("Erro ao atualizar RSVP:", error);
        UI.showToast('Não foi possível atualizar sua confirmação.', 'error');
    } finally {
        UI.setButtonLoading(button, false);
    }
}


// --- Funções de Configuração de Listeners ---
function setupNavListeners() {
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', handleNavigation);
    });
}

function setupAuthFormListeners() {
    document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('signup-form')?.addEventListener('submit', handleSignupSubmit);
    document.getElementById('show-signup')?.addEventListener('click', handleAuthFormSwitch);
    document.getElementById('show-login')?.addEventListener('click', handleAuthFormSwitch);

    // Listeners para login social
    document.getElementById('google-login-modal-button')?.addEventListener('click', (e) => handleSocialLogin('google', e.currentTarget));
    document.getElementById('facebook-login-modal-button')?.addEventListener('click', (e) => handleSocialLogin('facebook', e.currentTarget));
    document.getElementById('apple-login-modal-button')?.addEventListener('click', (e) => handleSocialLogin('apple', e.currentTarget));
    
    // Listeners para cadastro social
    document.getElementById('google-signup-button')?.addEventListener('click', (e) => handleSocialSignup('google', e.currentTarget));
    document.getElementById('facebook-signup-button')?.addEventListener('click', (e) => handleSocialSignup('facebook', e.currentTarget));
    document.getElementById('apple-signup-button')?.addEventListener('click', (e) => handleSocialSignup('apple', e.currentTarget));
}

function setupViewSpecificListeners() {
    cleanupListeners();

    if (appState.currentView === 'home' && appState.weddingDetails) {
        appState.countdownInterval = UI.updateCountdown(appState.weddingDetails.weddingDate);
    }
    if (appState.currentView === 'guest-photos') {
        if (appState.currentUser) {
            document.getElementById('upload-button')?.addEventListener('click', handlePhotoUploadClick);
            appState.galleryUnsubscribe = Firebase.listenToGuestPhotos(UI.renderGuestPhotos);
        }
    }
    if (appState.currentView === 'guestbook') {
        document.getElementById('open-login-button')?.addEventListener('click', () => {
            UI.renderAuthForm('login');
            setupAuthFormListeners();
        });
        if (appState.currentUser) {
            document.getElementById('guestbook-form')?.addEventListener('submit', handleGuestbookSubmit);
        }
        appState.guestbookUnsubscribe = Firebase.listenToGuestbookMessages(UI.renderGuestbookMessages);
    }
    if (appState.currentView === 'gifts') {
        if (appState.currentUser) {
            appState.giftListUnsubscribe = Firebase.listenToGiftList((gifts) => {
                UI.renderGiftList(gifts, appState.currentUser);
                document.querySelectorAll('.unmark-gift-btn').forEach(btn => btn.addEventListener('click', async (e) => {
                    const button = e.currentTarget;
                    UI.setButtonLoading(button, true);
                    try {
                        await Firebase.unmarkGiftAsTaken(button.dataset.id);
                        UI.showToast('Escolha desfeita.', 'success');
                    } catch (err) {
                        console.error("Error unmarking gift:", err);
                        UI.showToast('Erro ao desfazer a escolha.', 'error');
                    } finally {
                        UI.setButtonLoading(button, false);
                    }
                }));
                UI.initializeGiftEventListeners(appState.weddingDetails);
            });
        }
    }
    if (appState.currentView === 'rsvp') {
        document.getElementById('open-login-button')?.addEventListener('click', () => {
            UI.renderAuthForm('login');
            setupAuthFormListeners();
        });
        document.getElementById('open-signup-button')?.addEventListener('click', async () => {
            const key = prompt("Por favor, insira sua chave de acesso para iniciar o cadastro:");
            if (key) {
                const { isValid, isUsed, data } = await handleAccessKeyValidation(key.trim());
                if (isValid && !isUsed) {
                    appState.accessKeyInfo = { key: key.trim(), data };
                    UI.renderAuthForm('signup', key.trim(), data);
                    setupAuthFormListeners();
                } else {
                    UI.showToast(isUsed ? "Esta chave de acesso já foi utilizada." : "Chave de acesso inválida.", 'error');
                }
            }
        });
        document.getElementById('manage-rsvp-button')?.addEventListener('click', async () => {
            const keyData = appState.accessKeyInfo.data;
            const existingNames = await Firebase.getGuestNames(appState.accessKeyInfo.key);
            UI.renderRsvpManagementModal(keyData, existingNames, handleRsvpUpdate);
        });
    }
}

// --- Funções Principais ---

function renderCurrentView() {
    UI.renderView(appState.currentView, appState.currentUser, appState.weddingDetails, appState.accessKeyInfo);
    setupViewSpecificListeners();
}

async function updateUserArea(user) {
    const container = document.getElementById('user-actions-container');
    if (!container) return;

    if (user && !appState.accessKeyInfo) {
        const keyInfo = await Firebase.findAccessKeyForUser(user.email);
        if (keyInfo) {
            appState.accessKeyInfo = keyInfo;
        }
    } else if (!user) {
        appState.accessKeyInfo = null;
    }

    container.innerHTML = ''; 
    if (user) {
        const welcomeText = document.createElement('span');
        welcomeText.className = 'text-sm text-gray-600 dark:text-gray-300 hidden sm:inline';
        const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Convidado';
        welcomeText.textContent = `Olá, ${firstName}`;
        
        const logoutButton = document.createElement('button');
        logoutButton.title = 'Sair';
        logoutButton.setAttribute('aria-label', 'Sair da conta');
        logoutButton.className = 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-dark-primary transition-colors';
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt fa-lg"></i>';
        logoutButton.addEventListener('click', () => Firebase.auth.signOut());
        
        container.appendChild(welcomeText);
        
        if (adminEmails.includes(user.email)) {
            const adminButton = document.createElement('a');
            adminButton.href = 'admin.html';
            adminButton.target = '_blank';
            adminButton.title = 'Painel do Administrador';
            adminButton.setAttribute('aria-label', 'Acessar painel do administrador');
            adminButton.className = 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-dark-primary transition-colors';
            adminButton.innerHTML = '<i class="fas fa-user-shield fa-lg"></i>';
            container.appendChild(adminButton);
        }
        container.appendChild(logoutButton);
    }
}

function setupModalListeners() {
    document.getElementById('close-auth-modal').addEventListener('click', () => UI.toggleAuthModal(false));
    document.getElementById('close-pix-modal').addEventListener('click', () => UI.togglePixModal(false));
    document.getElementById('close-rsvp-modal')?.addEventListener('click', () => UI.toggleRsvpModal(false));

    document.getElementById('pix-modal').addEventListener('click', async (e) => {
        if (e.target.closest('#copy-pix-button')) {
            const input = document.getElementById('pix-copy-paste');
            input.select();
            document.execCommand('copy');
            UI.showToast('Código PIX copiado!', 'success');
        }
        const confirmButton = e.target.closest('#confirm-gift-button');
        if (confirmButton) {
            const giftId = confirmButton.dataset.id;
            UI.setButtonLoading(confirmButton, true);
            try {
                await Firebase.markGiftAsTaken(giftId, appState.currentUser);
                UI.togglePixModal(false);
                UI.showToast('Obrigado pelo seu presente!', 'success');
            } catch (err) {
                console.error("Erro ao marcar presente:", err);
                UI.showToast("Ocorreu um erro ao confirmar o seu presente.", 'error');
                UI.setButtonLoading(confirmButton, false);
            }
        }
    });
}

window.onpopstate = (event) => {
    if (event.state && event.state.view) {
        appState.currentView = event.state.view;
        renderCurrentView();
    }
};

async function initApp() {
    try {
        appState.weddingDetails = await Firebase.getWeddingDetails();
        if (!appState.weddingDetails) {
            document.body.innerHTML = `<div class="text-center p-8">Erro ao carregar os dados do casamento.</div>`;
            return;
        }

        UI.initToast();
        document.getElementById('loading-title').textContent = appState.weddingDetails.coupleNames;
        document.getElementById('page-title').textContent = appState.weddingDetails.coupleNames;

        initializeDarkMode();
        setupNavListeners();
        setupModalListeners();

        const urlParams = new URLSearchParams(window.location.search);
        const keyFromUrl = urlParams.get('key');
        const viewFromHash = window.location.hash.substring(1);

        appState.currentView = viewFromHash || 'home';
        
        Firebase.auth.onAuthStateChanged(async (user) => {
            appState.currentUser = user;
            await updateUserArea(user);

            if (keyFromUrl && !user) {
                const { isValid, isUsed, data } = await handleAccessKeyValidation(keyFromUrl);
                if (isValid && !isUsed) {
                    appState.accessKeyInfo = { key: keyFromUrl, data };
                    UI.renderAuthForm('signup', keyFromUrl, data);
                    setupAuthFormListeners();
                } else if (isUsed) {
                     UI.showToast('Este convite já foi utilizado. Por favor, faça login.', 'info');
                     UI.renderAuthForm('login');
                     setupAuthFormListeners();
                } else {
                    UI.showToast('Convite inválido.', 'error');
                }
            } else {
                 UI.toggleAuthModal(false);
            }
            
            renderCurrentView();
        });

        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('opacity-0');
            window.history.replaceState({ view: appState.currentView }, '', `#${appState.currentView}`);
            renderCurrentView();
        }, 500);

    } catch (error) {
        console.error('Erro fatal na inicialização:', error);
        document.body.innerHTML = `<div class="text-center p-8">Ocorreu um erro crítico ao carregar a aplicação. Verifique a sua ligação à Internet e tente novamente.</div>`;
    }
}

// Inicia a aplicação
initApp();
