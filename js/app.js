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
    rankingUnsubscribe: null,
    weddingDetails: null
};

function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true' || (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDarkMode) document.documentElement.classList.add('dark');
    document.getElementById('toggle-dark-mode')?.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', isDark.toString());
    });
}

function cleanupListeners() {
    if (appState.galleryUnsubscribe) appState.galleryUnsubscribe();
    if (appState.guestbookUnsubscribe) appState.guestbookUnsubscribe();
    if (appState.giftListUnsubscribe) appState.giftListUnsubscribe();
    if (appState.rankingUnsubscribe) appState.rankingUnsubscribe();
    if (appState.countdownInterval) clearInterval(appState.countdownInterval);
    appState.galleryUnsubscribe = null;
    appState.guestbookUnsubscribe = null;
    appState.giftListUnsubscribe = null;
    appState.rankingUnsubscribe = null;
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

function handleNavigation(view) {
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
    
    if (!key || !email || password.length < 6) return UI.showToast('Por favor, verifique todos os campos obrigatórios.', 'error');
    const guestNames = Array.from(document.querySelectorAll('.guest-name-input')).map(input => input.value.trim()).filter(name => name);
    if (guestNames.length === 0) return UI.showToast('Pelo menos um nome de convidado é obrigatório.', 'error');

    UI.setButtonLoading(button, true);
    try {
        const { isValid, isUsed, docId } = await handleAccessKeyValidation(key);
        if (!isValid || isUsed) {
            UI.showToast(isUsed ? "Esta chave de acesso já foi utilizada." : "Chave de acesso inválida.", 'error');
            return;
        }
        const mainGuestName = guestNames[0];
        const willAttendRestaurant = document.querySelector('input[name="attend-restaurant"]:checked')?.value === 'yes';
        await Firebase.signupUser({ name: mainGuestName, email, password, keyDocId: docId, guestNames, willAttendRestaurant });
        UI.showToast(`Bem-vindo(a), ${mainGuestName}! Cadastro realizado.`, 'success');
    } catch (error) {
        console.error('Erro no cadastro:', error);
        const message = error.code === 'auth/email-already-in-use' ? "Este email já está cadastrado." : "Erro ao criar a conta. Verifique os dados.";
        UI.showToast(message, 'error');
    } finally {
        UI.setButtonLoading(button, false);
    }
}

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

async function handleSocialSignup(provider, button) {
    const key = document.getElementById('signup-key')?.value.trim();
    if (!key) return UI.showToast("Por favor, insira sua chave de acesso antes de usar o cadastro rápido.", 'info');

    UI.setButtonLoading(button, true);
    try {
        const { isValid, isUsed, docId, data } = await handleAccessKeyValidation(key);
        if (!isValid || isUsed) {
            UI.showToast(isUsed ? "Esta chave já foi utilizada." : "Chave de acesso inválida.", 'error');
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
                await Firebase.signupUser({ name: user.displayName || guestNames[0], email: user.email, password: null, keyDocId: docId, guestNames, willAttendRestaurant, socialProvider: provider, user: user });
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
    if (!file || !appState.currentUser) return;
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('progress-bar');
    progressContainer.classList.remove('hidden');
    UI.setButtonLoading(uploadBtn, true);
    try {
        await Firebase.uploadPhoto(file, appState.currentUser, (progress) => { progressBar.style.width = `${progress}%`; });
        await Firebase.incrementEngagementScore(appState.currentUser, 'photo', 10);
        fileInput.value = '';
        UI.showToast('Foto enviada com sucesso! +10 pontos!', 'success');
    } catch (error) {
        UI.showToast('Erro no upload. Tente novamente.', 'error');
    } finally {
        UI.setButtonLoading(uploadBtn, false);
        setTimeout(() => progressContainer.classList.add('hidden'), 1000);
    }
}

async function handleGuestbookSubmit(event) {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    const messageInput = document.getElementById('guestbook-message');
    const message = messageInput.value.trim();
    if (!message || !appState.currentUser) return;
    UI.setButtonLoading(button, true);
    try {
        await Firebase.postGuestbookMessage(appState.currentUser, message);
        await Firebase.incrementEngagementScore(appState.currentUser, 'guestbook', 15);
        messageInput.value = '';
        UI.showToast('Sua mensagem foi enviada! +15 pontos!', 'success');
    } catch (error) {
        UI.showToast('Erro ao enviar mensagem.', 'error');
    } finally {
        UI.setButtonLoading(button, false);
    }
}

async function handleRsvpUpdate(event) {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    UI.setButtonLoading(button, true);
    const guestNames = Array.from(event.target.querySelectorAll('.guest-name-input')).map(input => input.value.trim()).filter(name => name);
    const willAttendRestaurant = event.target.querySelector('input[name="attend-restaurant-update"]:checked')?.value === 'yes';
    if (guestNames.length === 0) {
        UI.showToast('Pelo menos um nome de convidado é necessário.', 'error');
        UI.setButtonLoading(button, false);
        return;
    }
    try {
        await Firebase.updateRsvpDetails(appState.accessKeyInfo.key, { guestNames, willAttendRestaurant });
        appState.accessKeyInfo.data.willAttendRestaurant = willAttendRestaurant;
        renderCurrentView();
        UI.showToast('Confirmação atualizada com sucesso!', 'success');
        UI.toggleRsvpModal(false);
    } catch (error) {
        console.error("Erro ao atualizar RSVP:", error);
        UI.showToast('Não foi possível atualizar sua confirmação.', 'error');
    } finally {
        UI.setButtonLoading(button, false);
    }
}

function setupNavListeners() {
    document.querySelectorAll('.nav-button').forEach(button => button.addEventListener('click', (e) => handleNavigation(e.currentTarget.dataset.view)));
}

function setupAuthFormListeners() {
    document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('signup-form')?.addEventListener('submit', handleSignupSubmit);
    document.getElementById('show-signup')?.addEventListener('click', handleAuthFormSwitch);
    document.getElementById('show-login')?.addEventListener('click', handleAuthFormSwitch);
    document.getElementById('google-login-modal-button')?.addEventListener('click', (e) => handleSocialLogin('google', e.currentTarget));
    document.getElementById('facebook-login-modal-button')?.addEventListener('click', (e) => handleSocialLogin('facebook', e.currentTarget));
    document.getElementById('apple-login-modal-button')?.addEventListener('click', (e) => handleSocialLogin('apple', e.currentTarget));
    document.getElementById('google-signup-button')?.addEventListener('click', (e) => handleSocialSignup('google', e.currentTarget));
    document.getElementById('facebook-signup-button')?.addEventListener('click', (e) => handleSocialSignup('facebook', e.currentTarget));
    document.getElementById('apple-signup-button')?.addEventListener('click', (e) => handleSocialSignup('apple', e.currentTarget));
}

function setupViewSpecificListeners() {
    cleanupListeners();
    if (appState.currentView === 'home' && appState.weddingDetails) appState.countdownInterval = UI.updateCountdown(appState.weddingDetails.weddingDate);
    
    if (appState.currentView === 'guest-photos' && appState.currentUser) {
        document.getElementById('upload-button')?.addEventListener('click', handlePhotoUploadClick);
        appState.galleryUnsubscribe = Firebase.listenToGuestPhotos(UI.renderGuestPhotos);
    }
    
    if (appState.currentView === 'guestbook') {
        document.getElementById('open-login-button')?.addEventListener('click', () => { UI.renderAuthForm('login'); setupAuthFormListeners(); });
        if (appState.currentUser) document.getElementById('guestbook-form')?.addEventListener('submit', handleGuestbookSubmit);
        appState.guestbookUnsubscribe = Firebase.listenToGuestbookMessages(UI.renderGuestbookMessages);
    }

    if (appState.currentView === 'activities' && appState.currentUser) {
        appState.rankingUnsubscribe = Firebase.listenToRanking((rankingData) => {
            UI.renderRanking(rankingData, appState.currentUser.uid);
        });
    }
    
    if (appState.currentView === 'gifts' && appState.currentUser) {
        appState.giftListUnsubscribe = Firebase.listenToGiftList((gifts) => {
            UI.renderGiftList(gifts, appState.currentUser);
            document.querySelectorAll('.unmark-gift-btn').forEach(btn => btn.addEventListener('click', async (e) => {
                const button = e.currentTarget;
                UI.setButtonLoading(button, true);
                try {
                    await Firebase.unmarkGiftAsTaken(button.dataset.id);
                    await Firebase.incrementEngagementScore(appState.currentUser, 'gift', -25);
                    UI.showToast('Escolha desfeita.', 'success');
                } catch (err) {
                    console.error("Error unmarking gift:", err);
                    UI.showToast('Erro ao desfazer a escolha.', 'error');
                } finally { UI.setButtonLoading(button, false); }
            }));
            UI.initializeGiftEventListeners(appState.weddingDetails, appState.currentUser);
            document.getElementById('present-custom-amount-btn')?.addEventListener('click', () => {
                const amountInput = document.getElementById('custom-gift-amount');
                const amount = parseFloat(amountInput.value);
                if (isNaN(amount) || amount <= 0) {
                    UI.showToast('Por favor, insira um valor válido.', 'error');
                    return;
                }
                const customGift = { id: 'custom', name: 'Presente Especial', price: amount };
                UI.renderPixModal(customGift, appState.weddingDetails);
            });
        });
    }
    
    if (appState.currentView === 'rsvp') {
        document.getElementById('open-login-button')?.addEventListener('click', () => { UI.renderAuthForm('login'); setupAuthFormListeners(); });
        document.getElementById('open-signup-button')?.addEventListener('click', async () => {
            const key = prompt("Por favor, insira sua chave de acesso para iniciar o cadastro:");
            if (key) {
                const { isValid, isUsed, data } = await handleAccessKeyValidation(key.trim());
                if (isValid && !isUsed) {
                    appState.accessKeyInfo = { key: key.trim(), data };
                    UI.renderAuthForm('signup', key.trim(), data);
                    setupAuthFormListeners();
                } else { UI.showToast(isUsed ? "Esta chave de acesso já foi utilizada." : "Chave de acesso inválida.", 'error'); }
            }
        });
        document.getElementById('manage-rsvp-button')?.addEventListener('click', async () => {
            const keyData = appState.accessKeyInfo.data;
            const existingNames = await Firebase.getGuestNames(appState.accessKeyInfo.key);
            UI.renderRsvpManagementModal(keyData, existingNames, handleRsvpUpdate);
        });
        document.querySelectorAll('.quick-nav-button').forEach(btn => btn.addEventListener('click', (e) => handleNavigation(e.currentTarget.dataset.viewTarget)));
        
        document.getElementById('dress-code-button')?.addEventListener('click', () => {
            const userRole = appState.accessKeyInfo?.data?.role;
            if (userRole) {
                UI.renderDressCodeModal(appState.weddingDetails.dressCodePalettes, userRole);
            }
        });
    }
}

function renderCurrentView() {
    UI.renderView(appState.currentView, appState.currentUser, appState.weddingDetails, appState.accessKeyInfo);
    setupViewSpecificListeners();
}

// ATUALIZADO: Lógica de busca de dados do usuário simplificada e corrigida
async function updateUserArea(user) {
    const container = document.getElementById('user-actions-container');
    const activitiesButton = document.getElementById('activities-nav-button');
    const rsvpNavText = document.getElementById('rsvp-nav-text');

    if (activitiesButton) activitiesButton.classList.toggle('hidden', !user);
    if (rsvpNavText) rsvpNavText.textContent = user ? 'Portal' : 'Acesso';

    if (!container) return;

    // Lógica melhorada para buscar/limpar dados do convite
    if (user) {
        try {
            console.log('Buscando informações da chave para usuário:', user.uid);
            const keyInfo = await Firebase.findAccessKeyForUser(user.uid);
            console.log('Informações da chave encontradas:', keyInfo);
            appState.accessKeyInfo = keyInfo;
        } catch (error) {
            console.error('Erro ao buscar informações da chave:', error);
            appState.accessKeyInfo = null;
        }
    } else {
        appState.accessKeyInfo = null;
    }

    // Lógica para renderizar o cabeçalho
    container.innerHTML = ''; 
    if (user) {
        const welcomeText = document.createElement('span');
        welcomeText.className = 'text-sm text-gray-600 dark:text-gray-300 hidden sm:inline';
        welcomeText.textContent = `Olá, ${user.displayName ? user.displayName.split(' ')[0] : 'Convidado'}`;
        
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
    document.getElementById('close-dress-code-modal').addEventListener('click', () => UI.toggleDressCodeModal(false));

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
                if (giftId !== 'custom') {
                    await Firebase.markGiftAsTaken(giftId, appState.currentUser);
                }
                await Firebase.incrementEngagementScore(appState.currentUser, 'gift', 25);
                UI.togglePixModal(false);
                UI.showToast('Obrigado pelo seu presente! +25 pontos!', 'success');
            } catch (err) {
                console.error("Erro ao marcar presente:", err);
                UI.showToast("Ocorreu um erro ao confirmar o seu presente.", 'error');
            }
        }
    });
}

window.onpopstate = (event) => {
    if (event.state?.view) {
        appState.currentView = event.state.view;
        renderCurrentView();
    }
};

async function initApp() {

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => console.log('Service worker registrado.', reg))
                .catch((err) => console.log('Service worker não registrado.', err));
        });
    }

    try {
        appState.weddingDetails = await Firebase.getWeddingDetails();
        if (!appState.weddingDetails) {
            document.body.innerHTML = `<div class="text-center p-8">Erro ao carregar os dados do casamento.</div>`;
            return;
        }
        
        UI.initToast();
        document.getElementById('loading-title').textContent = appState.weddingDetails.coupleNames;
        document.getElementById('page-title').textContent = appState.weddingDetails.coupleNames;
        document.getElementById('page-title-header').textContent = appState.weddingDetails.coupleNames;
        initializeDarkMode();
        setupNavListeners();
        setupModalListeners();
        
        const urlParams = new URLSearchParams(window.location.search);
        const keyFromUrl = urlParams.get('key');
        const viewFromHash = window.location.hash.substring(1);
        const validViews = ['home', 'details', 'guest-photos', 'activities', 'guestbook', 'gifts', 'rsvp'];
        appState.currentView = validViews.includes(viewFromHash) ? viewFromHash : 'home';

        Firebase.auth.onAuthStateChanged(async (user) => {
            console.log('Auth state changed:', user ? user.uid : 'null');
            appState.currentUser = user;
            
            // Aguarda a atualização da área do usuário antes de continuar
            await updateUserArea(user);

            if (keyFromUrl && !user) {
                const showSignupFlow = async () => {
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
                };

                if (!localStorage.getItem('tutorialShown')) {
                    UI.showTutorialModal(() => {
                        localStorage.setItem('tutorialShown', 'true');
                        showSignupFlow();
                    });
                } else {
                    showSignupFlow();
                }
            } else {
                UI.toggleAuthModal(false);
            }
            
            console.log('Renderizando view atual:', appState.currentView);
            console.log('AccessKeyInfo:', appState.accessKeyInfo);
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

initApp();