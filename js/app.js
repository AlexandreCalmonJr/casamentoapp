// js/app.js

import { adminEmails } from './config.js';
import * as Firebase from './firebase-service.js';
import * as UI from './ui.js';

const appState = {
    currentView: 'home',
    currentUser: null,
    accessKey: null,
    countdownInterval: null,
    galleryUnsubscribe: null,
    guestbookUnsubscribe: null,
    giftListUnsubscribe: null,
    weddingDetails: null
};

// --- Funções de Ajuda e Utilitários ---

/**
 * CORREÇÃO: Carrega um script dinamicamente e retorna uma promessa.
 * @param {string} src A URL do script.
 * @returns {Promise<void>}
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Falha ao carregar o script: ${src}`));
        document.head.appendChild(script);
    });
}

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
        return { isValid: false, isUsed: false, data: null, error: 'Erro na validação' };
    }
}

// --- Funções de Manipulação de Eventos ---
function handleNavigation(event) {
    const view = event.currentTarget.dataset.view;
    if (view) {
        appState.currentView = view;
        renderCurrentView();
    }
}

function handleAuthFormSwitch(event) {
    const targetForm = event.target.id === 'show-signup' ? 'signup' : 'login';
    UI.renderAuthForm(targetForm, appState.accessKey);
    setupAuthFormListeners();
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.classList.add('hidden');
    UI.setButtonLoading(button, true);
    try {
        await Firebase.loginUser(email, password);
    } catch (error) {
        errorEl.textContent = "Email ou senha inválidos.";
        errorEl.classList.remove('hidden');
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
    const errorEl = document.getElementById('auth-error');
    errorEl.classList.add('hidden');
    if (!key || !email || password.length < 6) {
        errorEl.textContent = "Verifique os campos obrigatórios.";
        return errorEl.classList.remove('hidden');
    }
    const guestNameInputs = document.querySelectorAll('.guest-name-input');
    const guestNames = Array.from(guestNameInputs).map(input => input.value.trim()).filter(name => name);
    if (guestNames.length === 0) {
        errorEl.textContent = "Pelo menos um nome de convidado é obrigatório.";
        return errorEl.classList.remove('hidden');
    }
    UI.setButtonLoading(button, true);
    try {
        const { isValid, isUsed, docId, data, error } = await handleAccessKeyValidation(key);
        if (error || !isValid || isUsed) {
            errorEl.textContent = isUsed ? "Esta chave já foi utilizada." : "Chave de acesso inválida.";
            return errorEl.classList.remove('hidden');
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
    } catch (error) {
        console.error('Erro no cadastro:', error);
        errorEl.textContent = "Erro ao criar a conta. Verifique os dados.";
        if (error.code === 'auth/email-already-in-use') {
            errorEl.textContent = "Este email já está cadastrado.";
        }
        errorEl.classList.remove('hidden');
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
    const errorEl = document.getElementById('upload-error');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('progress-bar');
    errorEl.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    UI.setButtonLoading(uploadBtn, true);
    try {
        await Firebase.uploadPhoto(file, user, (progress) => {
            progressBar.style.width = `${progress}%`;
        });
        fileInput.value = '';
    } catch (error) {
        errorEl.textContent = "Erro no upload. Tente novamente.";
        errorEl.classList.remove('hidden');
    } finally {
        UI.setButtonLoading(uploadBtn, false);
        setTimeout(() => progressContainer.classList.add('hidden'), 1000);
    }
}

async function handleGoogleLoginClick(event) {
    const button = event.currentTarget;
    UI.setButtonLoading(button, true);
    try {
        await Firebase.signInWithGoogle();
    } catch (error) {
        const errorEl = document.getElementById('auth-error');
        if (errorEl) {
            errorEl.textContent = "Erro ao fazer login com Google.";
            errorEl.classList.remove('hidden');
        }
        console.error("Google Sign-In Error", error);
    } finally {
        UI.setButtonLoading(button, false);
    }
}

async function handleGuestbookSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    const messageInput = document.getElementById('guestbook-message');
    const message = messageInput.value.trim();
    const user = appState.currentUser;
    const errorEl = document.getElementById('guestbook-error');
    errorEl.classList.add('hidden');
    if (!message || !user) return;
    UI.setButtonLoading(button, true);
    try {
        await Firebase.postGuestbookMessage(user, message);
        messageInput.value = '';
    } catch (error) {
        errorEl.textContent = "Erro ao enviar mensagem.";
        errorEl.classList.remove('hidden');
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
    document.getElementById('google-login-modal-button')?.addEventListener('click', handleGoogleLoginClick);
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
            UI.renderAuthForm('login', appState.accessKey);
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
                UI.renderGiftList(gifts, appState.currentUser, appState.weddingDetails);
                document.querySelectorAll('.unmark-gift-btn').forEach(btn => btn.addEventListener('click', async (e) => {
                    const button = e.currentTarget;
                    UI.setButtonLoading(button, true);
                    try {
                        await Firebase.unmarkGiftAsTaken(button.dataset.id);
                    } catch (err) {
                        console.error("Error unmarking gift:", err);
                        UI.setButtonLoading(button, false);
                    }
                }));
                // CORREÇÃO: Chamando a função com o nome correto.
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
                    UI.renderAuthForm('signup', key.trim(), data);
                    setupAuthFormListeners();
                } else {
                    alert(isUsed ? "Esta chave de acesso já foi utilizada." : "Chave de acesso inválida.");
                }
            }
        });
        if (appState.accessKey) {
            setTimeout(async () => {
                const { isValid, isUsed, data } = await handleAccessKeyValidation(appState.accessKey);
                if (isValid && !isUsed) {
                    UI.renderAuthForm('signup', appState.accessKey, data);
                    setupAuthFormListeners();
                } else {
                    alert(isUsed ? "Esta chave de acesso já foi utilizada." : "Chave de acesso inválida.");
                }
            }, 100);
        }
    }
}

// --- Funções Principais ---

function renderCurrentView() {
    UI.renderView(appState.currentView, appState.currentUser, appState.weddingDetails);
    setupViewSpecificListeners();
}

function updateUserArea(user) {
    const container = document.getElementById('user-actions-container');
    if (!container) return;
    container.innerHTML = ''; 
    if (user) {
        const welcomeText = document.createElement('span');
        welcomeText.className = 'text-sm text-gray-600 dark:text-gray-300 hidden sm:inline';
        const firstName = user.displayName ? user.displayName.split(' ')[0] : 'Convidado';
        welcomeText.textContent = `Olá, ${firstName}`;
        const logoutButton = document.createElement('button');
        logoutButton.title = 'Sair';
        logoutButton.className = 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-dark-primary transition-colors';
        logoutButton.innerHTML = '<i class="fas fa-sign-out-alt fa-lg"></i>';
        logoutButton.addEventListener('click', () => Firebase.auth.signOut());
        container.appendChild(welcomeText);
        if (adminEmails.includes(user.email)) {
            const adminButton = document.createElement('a');
            adminButton.href = 'admin.html';
            adminButton.target = '_blank';
            adminButton.title = 'Painel do Administrador';
            adminButton.className = 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-dark-primary transition-colors';
            adminButton.innerHTML = '<i class="fas fa-user-shield fa-lg"></i>';
            container.appendChild(adminButton);
        }
        container.appendChild(logoutButton);
    } else {
        const adminLoginLink = document.createElement('a');
        adminLoginLink.href = 'admin.html';
        adminLoginLink.className = 'text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-dark-primary flex items-center';
        adminLoginLink.innerHTML = '<i class="fas fa-user-shield mr-2"></i><span>Admin</span>';
        adminLoginLink.title = "Acesso do Administrador";
        container.appendChild(adminLoginLink);
    }
}

function setupModalListeners() {
    document.getElementById('close-auth-modal').addEventListener('click', () => UI.toggleAuthModal(false));
    const pixModal = document.getElementById('pix-modal');
    document.getElementById('close-pix-modal').addEventListener('click', () => UI.togglePixModal(false));
    pixModal.addEventListener('click', async (e) => {
        if (e.target.closest('#copy-pix-button')) {
            const input = document.getElementById('pix-copy-paste');
            input.select();
            document.execCommand('copy');
            e.target.closest('#copy-pix-button').innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                e.target.closest('#copy-pix-button').innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        }
        const confirmButton = e.target.closest('#confirm-gift-button');
        if (confirmButton) {
            const giftId = confirmButton.dataset.id;
            UI.setButtonLoading(confirmButton, true);
            try {
                await Firebase.markGiftAsTaken(giftId, appState.currentUser);
                UI.togglePixModal(false);
            } catch (err) {
                console.error("Erro ao marcar presente:", err);
                alert("Ocorreu um erro ao confirmar o seu presente. Por favor, tente novamente.");
                UI.setButtonLoading(confirmButton, false);
            }
        }
    });
}

async function initApp() {
    try {
        appState.weddingDetails = await Firebase.getWeddingDetails();
        if (!appState.weddingDetails) {
            document.body.innerHTML = `<div class="text-center p-8">Erro ao carregar os dados do casamento.</div>`;
            return;
        }

        document.getElementById('loading-title').textContent = appState.weddingDetails.coupleNames;
        document.getElementById('page-title').textContent = appState.weddingDetails.coupleNames;

        initializeDarkMode();
        setupNavListeners();
        setupModalListeners();

        const urlParams = new URLSearchParams(window.location.search);
        appState.accessKey = urlParams.get('key');
        
        if (appState.accessKey) {
            // ...
        }
        
        Firebase.auth.onAuthStateChanged(user => {
            appState.currentUser = user;
            UI.toggleAuthModal(false);
            updateUserArea(user);
            renderCurrentView();
        });

        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('opacity-0');
            renderCurrentView();
        }, 500);

    } catch (error) {
        console.error('Erro fatal na inicialização:', error);
        document.body.innerHTML = `<div class="text-center p-8">Ocorreu um erro crítico ao carregar a aplicação. Verifique a sua ligação à Internet e tente novamente.</div>`;
    }
}

// Inicia a aplicação
initApp();
