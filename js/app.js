// js/app.js

// Importa os módulos necessários
import { adminEmails } from './config.js';
import * as Firebase from './firebase-service.js';
import * as UI from './ui.js';

// Estado da Aplicação
const appState = {
    currentView: 'home',
    currentUser: null,
    accessKey: null,
    countdownInterval: null,
    galleryUnsubscribe: null,
    guestbookUnsubscribe: null,
    giftListUnsubscribe: null,
    weddingDetails: null // Detalhes virão do DB
};

// --- Funções de Melhoria e Utilitários ---

/**
 * Gerencia o dark mode, salvando a preferência do usuário no localStorage.
 */
function initializeDarkMode() {
    // Verifica preferência salva ou do sistema
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

/**
 * Cancela todos os listeners do Firestore e intervalos para evitar vazamentos de memória.
 */
function cleanupListeners() {
    // Cancela listeners específicos do Firestore
    if (appState.galleryUnsubscribe) {
        appState.galleryUnsubscribe();
        appState.galleryUnsubscribe = null;
    }
    if (appState.guestbookUnsubscribe) {
        appState.guestbookUnsubscribe();
        appState.guestbookUnsubscribe = null;
    }
    if (appState.giftListUnsubscribe) {
        appState.giftListUnsubscribe();
        appState.giftListUnsubscribe = null;
    }
    if (appState.countdownInterval) {
        clearInterval(appState.countdownInterval);
        appState.countdownInterval = null;
    }
}

/**
 * Wrapper para a validação de chave com tratamento de erro.
 * @param {string} key - A chave de acesso.
 * @returns {Promise<Object>}
 */
async function handleAccessKeyValidation(key) {
    try {
        const result = await Firebase.validateAccessKey(key);
        return result;
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
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.classList.add('hidden');

    try {
        await Firebase.loginUser(email, password);
        // O onAuthStateChanged cuidará do resto
    } catch (error) {
        errorEl.textContent = "Email ou senha inválidos.";
        errorEl.classList.remove('hidden');
    }
}

async function handleSignupSubmit(event) {
    event.preventDefault();
    const key = document.getElementById('signup-key').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const errorEl = document.getElementById('auth-error');
    
    errorEl.classList.add('hidden');

    // Validações básicas
    if (!key) {
        errorEl.textContent = "A chave de acesso é obrigatória.";
        return errorEl.classList.remove('hidden');
    }
    if (!email) {
        errorEl.textContent = "O email é obrigatório.";
        return errorEl.classList.remove('hidden');
    }
    if (password.length < 6) {
        errorEl.textContent = "A senha deve ter pelo menos 6 caracteres.";
        return errorEl.classList.remove('hidden');
    }

    // Validar nomes dos convidados
    const guestNameInputs = document.querySelectorAll('.guest-name-input');
    const guestNames = Array.from(guestNameInputs).map(input => input.value.trim()).filter(name => name);
    
    if (guestNames.length === 0) {
        errorEl.textContent = "Pelo menos um nome de convidado é obrigatório.";
        return errorEl.classList.remove('hidden');
    }

    try {
        const { isValid, isUsed, docId, data, error } = await handleAccessKeyValidation(key);

        if (error) {
            errorEl.textContent = "Erro ao verificar a chave de acesso.";
            return errorEl.classList.remove('hidden');
        }
        if (!isValid) {
            errorEl.textContent = "Chave de acesso inválida.";
            return errorEl.classList.remove('hidden');
        }
        if (isUsed) {
            errorEl.textContent = "Esta chave de acesso já foi utilizada.";
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
        if (error.code === 'auth/email-already-in-use') {
            errorEl.textContent = "Este email já está cadastrado.";
        } else if (error.code === 'auth/weak-password') {
            errorEl.textContent = "Senha muito fraca. Use pelo menos 6 caracteres.";
        } else if (error.code === 'auth/invalid-email') {
            errorEl.textContent = "Email inválido.";
        } else {
            errorEl.textContent = "Erro ao criar a conta. Verifique os dados.";
        }
        errorEl.classList.remove('hidden');
    }
}

async function handlePhotoUploadClick() {
    const fileInput = document.getElementById('photo-input');
    const file = fileInput.files[0];
    const user = appState.currentUser;
    
    if (!file || !user) return;

    const errorEl = document.getElementById('upload-error');
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('progress-bar');
    
    errorEl.classList.add('hidden');
    progressContainer.classList.remove('hidden');

    try {
        await Firebase.uploadPhoto(file, user, (progress) => {
            progressBar.style.width = `${progress}%`;
        });
        fileInput.value = '';
    } catch (error) {
        errorEl.textContent = "Erro no upload. Tente novamente.";
        errorEl.classList.remove('hidden');
    } finally {
        setTimeout(() => progressContainer.classList.add('hidden'), 1000);
    }
}

async function handleGoogleLoginClick() {
    try {
        await Firebase.signInWithGoogle();
        // onAuthStateChanged vai cuidar do resto, fechando o modal
    } catch (error) {
        const errorEl = document.getElementById('auth-error');
        if (errorEl) {
            errorEl.textContent = "Erro ao fazer login com Google.";
            errorEl.classList.remove('hidden');
        }
        console.error("Google Sign-In Error", error);
    }
}

async function handleGuestbookSubmit(event) {
    event.preventDefault();
    const messageInput = document.getElementById('guestbook-message');
    const message = messageInput.value.trim();
    const user = appState.currentUser;
    const errorEl = document.getElementById('guestbook-error');
    errorEl.classList.add('hidden');

    if (!message || !user) return;

    try {
        await Firebase.postGuestbookMessage(user, message);
        messageInput.value = '';
    } catch (error) {
        errorEl.textContent = "Erro ao enviar mensagem.";
        errorEl.classList.remove('hidden');
    }
}

// --- Funções de Configuração de Listeners ---

function setupNavListeners() {
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', handleNavigation);
    });
}

function setupAuthFormListeners() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const googleBtn = document.getElementById('google-login-modal-button');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
        document.getElementById('show-signup').addEventListener('click', handleAuthFormSwitch);
    }
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignupSubmit);
        document.getElementById('show-login').addEventListener('click', handleAuthFormSwitch);
    }
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleLoginClick);
    }
}

function setupViewSpecificListeners() {
    cleanupListeners();

    if (appState.currentView === 'home' && appState.weddingDetails) {
        appState.countdownInterval = UI.updateCountdown(appState.weddingDetails.weddingDate);
    }
    if (appState.currentView === 'guest-photos') {
        if (appState.currentUser) {
            const logoutBtn = document.getElementById('logout-button');
            const uploadBtn = document.getElementById('upload-button');
            if(logoutBtn) logoutBtn.addEventListener('click', () => Firebase.auth.signOut());
            if(uploadBtn) uploadBtn.addEventListener('click', handlePhotoUploadClick);

            appState.galleryUnsubscribe = Firebase.listenToGuestPhotos(UI.renderGuestPhotos);
        }
    }
    if (appState.currentView === 'guestbook') {
        const openLoginBtn = document.getElementById('open-login-button');
        if (openLoginBtn) openLoginBtn.addEventListener('click', () => {
            UI.renderAuthForm('login', appState.accessKey);
            setupAuthFormListeners();
        });

        if (appState.currentUser) {
            const guestbookForm = document.getElementById('guestbook-form');
            if(guestbookForm) guestbookForm.addEventListener('submit', handleGuestbookSubmit);
        }
        appState.guestbookUnsubscribe = Firebase.listenToGuestbookMessages(UI.renderGuestbookMessages);
    }
    if (appState.currentView === 'gifts') {
        if (appState.currentUser) {
            appState.giftListUnsubscribe = Firebase.listenToGiftList((gifts) => {
                UI.renderGiftList(gifts, appState.currentUser);
                document.querySelectorAll('.mark-gift-btn').forEach(btn => btn.addEventListener('click', (e) => Firebase.markGiftAsTaken(e.target.dataset.id, appState.currentUser)));
                document.querySelectorAll('.unmark-gift-btn').forEach(btn => btn.addEventListener('click', (e) => Firebase.unmarkGiftAsTaken(e.target.dataset.id)));
            });
        }
    }
    if (appState.currentView === 'rsvp') {
        const openLoginBtn = document.getElementById('open-login-button');
        const openSignupBtn = document.getElementById('open-signup-button');

        if (openLoginBtn) {
            openLoginBtn.addEventListener('click', () => {
                UI.renderAuthForm('login');
                setupAuthFormListeners();
            });
        }

        if (openSignupBtn) {
            openSignupBtn.addEventListener('click', async () => {
                const key = prompt("Por favor, insira sua chave de acesso para iniciar o cadastro:");
                if (key) {
                    const { isValid, isUsed, data } = await handleAccessKeyValidation(key.trim());
                    if (isValid && !isUsed) {
                        UI.renderAuthForm('signup', key.trim(), data);
                        setupAuthFormListeners();
                    } else if (isUsed) {
                        alert("Esta chave de acesso já foi utilizada.");
                    } else {
                        alert("Chave de acesso inválida.");
                    }
                }
            });
        }

        // NOVO: Se temos uma chave válida no URL, abrir automaticamente o modal de cadastro
        if (appState.accessKey) {
            setTimeout(async () => {
                const { isValid, isUsed, data } = await handleAccessKeyValidation(appState.accessKey);
                if (isValid && !isUsed) {
                    UI.renderAuthForm('signup', appState.accessKey, data);
                    setupAuthFormListeners();
                } else if (isUsed) {
                    alert("Esta chave de acesso já foi utilizada.");
                } else {
                    alert("Chave de acesso inválida.");
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

async function initApp() {
    try {
        appState.weddingDetails = await Firebase.getWeddingDetails();
        if (!appState.weddingDetails) {
            document.body.innerHTML = `<div class="text-center p-8">Erro ao carregar os dados do casamento. Verifique a configuração do Firestore.</div>`;
            return;
        }

        const loadingTitle = document.getElementById('loading-title');
        const pageTitle = document.getElementById('page-title');
        if (loadingTitle) loadingTitle.textContent = appState.weddingDetails.coupleNames;
        if (pageTitle) pageTitle.textContent = appState.weddingDetails.coupleNames;

        initializeDarkMode();
        
        document.getElementById('close-auth-modal').addEventListener('click', () => UI.toggleAuthModal(false));
        setupNavListeners();

        // Verificar se existe uma chave de acesso no URL
        const urlParams = new URLSearchParams(window.location.search);
        appState.accessKey = urlParams.get('key');
        
        // Se tem chave válida, redirecionar para RSVP
        if (appState.accessKey) {
            const { isValid, isUsed } = await handleAccessKeyValidation(appState.accessKey);
            if (isValid && !isUsed) {
                appState.currentView = 'rsvp'; // MUDAR PARA RSVP EM VEZ DE FICAR NA HOME
            } else {
                alert(isUsed ? "Esta chave de acesso já foi utilizada." : "Chave de acesso inválida.");
                window.history.replaceState({}, document.title, window.location.pathname);
                appState.accessKey = null;
            }
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
            renderCurrentView(); // Renderizar a view atual (home ou rsvp se tem chave)
        }, 500);

    } catch (error) {
        console.error('Erro na inicialização:', error);
        document.body.innerHTML = `<div class="text-center p-8">Erro ao inicializar a aplicação. Recarregue a página.</div>`;
    }
}

initApp();