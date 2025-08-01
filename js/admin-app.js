// js/admin-app.js

import * as UI from './admin-ui.js';
import { adminEmails } from './config.js';
import { auth, db } from './firebase-service.js';

// --- Estado da Aplicação Admin ---
const state = {
    currentTab: 'report', // Aba inicial
    unsubscribe: {}, 
};

// --- Elementos da DOM ---
const DOMElements = {
    loginScreen: document.getElementById('login-screen'),
    adminDashboard: document.getElementById('admin-dashboard'),
    googleLoginBtn: document.getElementById('google-login-button'),
    logoutBtn: document.getElementById('logout-button'),
    adminEmailEl: document.getElementById('admin-email'),
    sidebarNav: document.getElementById('sidebar-nav'),
    tabContent: document.getElementById('tab-content'),
    shareModal: document.getElementById('share-modal'),
    closeShareModalBtn: document.getElementById('close-share-modal'),
    mobileMenuBtn: document.getElementById('mobile-menu-button'),
    sidebar: document.getElementById('sidebar'),
};

// --- Funções de Lógica e Eventos ---

function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        const loginErrorEl = document.getElementById('login-error');
        loginErrorEl.textContent = "Erro ao fazer login com Google.";
        loginErrorEl.classList.remove('hidden');
    });
}

async function handleSaveDetails(event) {
    const button = event.currentTarget;
    UI.setButtonLoading(button, true);
    
    const successMsg = document.getElementById('details-success');
    
    const updatedDetails = {
        coupleNames: document.getElementById('form-couple-names').value,
        weddingDate: new Date(document.getElementById('form-wedding-date').value),
        rsvpDate: new Date(document.getElementById('form-rsvp-date').value),
        venue: document.getElementById('form-venue').value,
        dressCode: document.getElementById('form-dress-code').value,
        restaurantName: document.getElementById('form-restaurant-name').value,
        restaurantAddress: document.getElementById('form-restaurant-address').value,
        restaurantPriceInfo: document.getElementById('form-restaurant-price').value,
        restaurantMapsLink: document.getElementById('form-restaurant-mapslink').value,
        pixKey: document.getElementById('form-pix-key').value.trim()
    };
    
    await db.collection('siteConfig').doc('details').update(updatedDetails);
    
    UI.setButtonLoading(button, false);
    successMsg.classList.remove('hidden');
    setTimeout(() => successMsg.classList.add('hidden'), 3000);
}

async function handleGenerateKey() {
    const guestName = document.getElementById('guest-name').value.trim();
    const guestPhone = document.getElementById('guest-phone').value.trim();
    const inviteType = document.getElementById('invite-type').value;
    const allowedGuests = parseInt(document.getElementById('allowed-guests').value, 10);
    const generateBtn = document.getElementById('generate-key-button');

    if (!guestName || !allowedGuests || allowedGuests < 1) {
        alert("Por favor, preencha o nome e o número de pessoas.");
        return;
    }
    
    UI.setButtonLoading(generateBtn, true);

    const newKey = 'AS' + Math.random().toString(36).substring(2, 10).toUpperCase();
    await db.collection('accessKeys').doc(newKey).set({
        guestName, guestPhone, inviteType, allowedGuests,
        isUsed: false, usedByEmail: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        willAttendRestaurant: null
    });
    
    showShareModal(guestName, newKey, allowedGuests, guestPhone);
    document.getElementById('guest-name').value = '';
    document.getElementById('guest-phone').value = '';
    UI.setButtonLoading(generateBtn, false);
}

async function handleDeleteMessage(event) {
    const messageId = event.currentTarget.dataset.id;
    const confirmed = await UI.showConfirmationModal({
        title: 'Apagar Mensagem',
        message: 'Tem certeza que deseja apagar esta mensagem permanentemente?',
    });
    if (confirmed) {
        await db.collection('guestbook').doc(messageId).delete();
    }
}

async function handleAddGift(event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    UI.setButtonLoading(button, true);
    
    const name = document.getElementById('gift-name').value;
    const description = document.getElementById('gift-description').value;
    const imageUrl = document.getElementById('gift-image-url').value;
    // MELHORIA: Pega o valor do presente
    const price = parseFloat(document.getElementById('gift-price').value) || 0;

    await db.collection('giftList').add({
        name,
        description,
        imageUrl,
        price, // Salva o valor
        isTaken: false,
        takenBy: null
    });

    UI.setButtonLoading(button, false);
    form.reset();
}

async function handleDeleteGift(event) {
    const giftId = event.currentTarget.dataset.id;
    const confirmed = await UI.showConfirmationModal({
        title: 'Apagar Presente',
        message: 'Tem certeza que deseja apagar este presente da lista?',
    });
    if (confirmed) {
        await db.collection('giftList').doc(giftId).delete();
    }
}

async function handleEditGift(event) {
    const giftId = event.currentTarget.dataset.id;
    const giftDoc = await db.collection('giftList').doc(giftId).get();
    const gift = giftDoc.data();

    // MELHORIA: Permite editar o preço também
    const newName = prompt("Editar nome do presente:", gift.name);
    const newPrice = prompt("Editar valor do presente (R$):", gift.price || '0');
    const newImageUrl = prompt("Editar URL da imagem:", gift.imageUrl);
    
    if (newName !== null && newPrice !== null && newImageUrl !== null) {
        await db.collection('giftList').doc(giftId).update({
            name: newName,
            price: parseFloat(newPrice) || 0,
            imageUrl: newImageUrl
        });
    }
}

async function handleDeleteKey(event) {
    const keyId = event.currentTarget.dataset.id;
    const confirmed = await UI.showConfirmationModal({
        title: 'Apagar Convite',
        message: 'Se o convidado já se cadastrou, a conta dele não será apagada, mas o registro do convite sim. Continuar?',
    });
    if (confirmed) {
        await db.collection('accessKeys').doc(keyId).delete();
    }
}

async function handleEditKey(event) {
    const keyId = event.currentTarget.dataset.id;
    const keyDoc = await db.collection('accessKeys').doc(keyId).get();
    const key = keyDoc.data();
    const newName = prompt("Editar nome do convidado:", key.guestName);
    const newCount = prompt("Editar número de pessoas:", key.allowedGuests);
    if (newName !== null && newCount !== null) {
        await db.collection('accessKeys').doc(keyId).update({
            guestName: newName,
            allowedGuests: parseInt(newCount, 10)
        });
    }
}

async function handleDeletePhoto(event) {
    const photoId = event.currentTarget.dataset.id;
    const confirmed = await UI.showConfirmationModal({
        title: 'Apagar Foto',
        message: 'Tem certeza que deseja apagar esta foto da galeria?',
    });
    if (confirmed) {
        await db.collection('guestPhotos').doc(photoId).delete();
    }
}

async function handleToggleGuestNames(event) {
    const keyId = event.currentTarget.dataset.id;
    const listContainer = document.getElementById(`guest-names-list-${keyId}`);
    if (!listContainer) return;

    const isHidden = listContainer.classList.contains('hidden');
    if (isHidden) {
        listContainer.classList.remove('hidden');
        const snapshot = await db.collection('accessKeys').doc(keyId).collection('guestNames').get();
        if (snapshot.empty) {
            listContainer.innerHTML = `<p class="text-xs text-gray-500">Nomes não informados.</p>`;
        } else {
            const names = snapshot.docs.map(doc => `<li>${doc.data().name}</li>`).join('');
            listContainer.innerHTML = `<ul class="text-sm text-gray-600 list-disc list-inside">${names}</ul>`;
        }
    } else {
        listContainer.classList.add('hidden');
    }
}

async function handleExportCSV() {
    const snapshot = await db.collection('accessKeys').where('isUsed', '==', true).get();
    if (snapshot.empty) {
        alert("Nenhum convidado cadastrado para exportar.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Convidado Principal,Email,Total de Pessoas,Vai ao Restaurante,Nomes dos Acompanhantes\r\n";

    for (const doc of snapshot.docs) {
        const key = doc.data();
        const namesSnapshot = await db.collection('accessKeys').doc(doc.id).collection('guestNames').get();
        const guestNames = namesSnapshot.docs.map(d => d.data().name).join('; ');
        
        const row = [
            `"${key.guestName}"`,
            key.usedByEmail,
            key.allowedGuests,
            key.willAttendRestaurant ? "Sim" : "Não",
            `"${guestNames}"`
        ].join(',');
        csvContent += row + "\r\n";
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_convidados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleShareKey(event) {
    const keyData = JSON.parse(event.currentTarget.dataset.key);
    showShareModal(keyData.guestName, keyData.id, keyData.allowedGuests, keyData.guestPhone);
}


// --- Funções Principais de Carregamento ---

function cleanupListeners() {
    Object.values(state.unsubscribe).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
    });
    state.unsubscribe = {};
}

async function loadTab(tabName) {
    state.currentTab = tabName;
    UI.setActiveSidebarLink(tabName);
    DOMElements.tabContent.innerHTML = UI.renderLoadingSpinner();

    if (window.innerWidth < 1024) {
        DOMElements.sidebar.classList.add('-translate-x-full');
    }

    cleanupListeners();

    if (tabName === 'details') {
        const details = (await db.collection('siteConfig').doc('details').get()).data();
        DOMElements.tabContent.innerHTML = UI.renderDetailsEditor(details);
        document.getElementById('save-all-details-button').addEventListener('click', handleSaveDetails);
    } else if (tabName === 'keys') {
        DOMElements.tabContent.innerHTML = UI.renderKeyManager();
        document.getElementById('generate-key-button').addEventListener('click', handleGenerateKey);
        document.getElementById('invite-type').addEventListener('change', (e) => {
            document.getElementById('allowed-guests').readOnly = e.target.value === 'individual';
            if (e.target.value === 'individual') document.getElementById('allowed-guests').value = 1;
        });
        state.unsubscribe.keys = db.collection('accessKeys').orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                UI.updateKeysList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.edit-key-btn').forEach(btn => btn.addEventListener('click', handleEditKey));
                document.querySelectorAll('.delete-key-btn').forEach(btn => btn.addEventListener('click', handleDeleteKey));
                document.querySelectorAll('.share-key-btn').forEach(btn => btn.addEventListener('click', handleShareKey));
            });
    } else if (tabName === 'report') {
        DOMElements.tabContent.innerHTML = UI.renderGuestsReport();
        document.getElementById('export-csv-button').addEventListener('click', handleExportCSV);
        state.unsubscribe.report = db.collection('accessKeys').where('isUsed', '==', true).orderBy('usedAt', 'desc')
            .onSnapshot(snap => {
                UI.updateGuestsReport(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.report-item').forEach(item => item.addEventListener('click', handleToggleGuestNames));
            });
    } else if (tabName === 'guestbook') {
        DOMElements.tabContent.innerHTML = UI.renderGuestbookAdmin();
        state.unsubscribe.guestbook = db.collection('guestbook').orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                UI.updateGuestbookAdminList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.delete-message-btn').forEach(btn => btn.addEventListener('click', handleDeleteMessage));
            });
    } else if (tabName === 'gifts') {
        DOMElements.tabContent.innerHTML = UI.renderGiftsManager();
        document.getElementById('add-gift-form').addEventListener('submit', handleAddGift);
        state.unsubscribe.gifts = db.collection('giftList').orderBy('name')
            .onSnapshot(snap => {
                UI.updateGiftsAdminList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.edit-gift-btn').forEach(btn => btn.addEventListener('click', handleEditGift));
                document.querySelectorAll('.delete-gift-btn').forEach(btn => btn.addEventListener('click', handleDeleteGift));
            });
    } else if (tabName === 'admin-gallery') {
        DOMElements.tabContent.innerHTML = UI.renderAdminGallery();
        state.unsubscribe.adminGallery = db.collection('guestPhotos').orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                UI.updateAdminGallery(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.delete-photo-btn').forEach(btn => btn.addEventListener('click', handleDeletePhoto));
            });
    }
}

function showShareModal(guestName, key, allowedGuests, phone) {
    const siteBaseUrl = window.location.origin;
    const fullLink = `${siteBaseUrl}/index.html?key=${key}`;

    document.getElementById('modal-guest-name').textContent = guestName;
    document.getElementById('modal-allowed-guests').textContent = allowedGuests;
    document.getElementById('invite-link').value = fullLink;

    const canvas = document.getElementById('qrcode');
    QRCode.toCanvas(canvas, fullLink, { width: 200 }, function (error) {
        if (error) console.error(error);
        document.getElementById('download-qr-button').href = canvas.toDataURL();
    });

    const whatsappBtn = document.getElementById('whatsapp-share-button');
    if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        const message = `Olá, ${guestName}! ❤️ Com muita alegria, estamos enviando o convite digital para o nosso casamento. Por favor, acesse o link abaixo para confirmar sua presença e encontrar todos os detalhes do nosso grande dia. Mal podemos esperar para celebrar com você! Com carinho, Alexandre & Andressa. ${fullLink}`;
        const phoneForWhatsapp = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const whatsappUrl = `https://wa.me/${phoneForWhatsapp}?text=${encodeURIComponent(message)}`;
        
        whatsappBtn.onclick = () => window.open(whatsappUrl, '_blank');
        whatsappBtn.classList.remove('hidden');
    } else {
        whatsappBtn.classList.add('hidden');
    }

    DOMElements.shareModal.classList.remove('hidden');
}


// --- Funções de Inicialização ---

function setupEventListeners() {
    DOMElements.googleLoginBtn.addEventListener('click', handleGoogleLogin);
    DOMElements.logoutBtn.addEventListener('click', () => auth.signOut());
    
    DOMElements.sidebarNav.addEventListener('click', (event) => {
        const link = event.target.closest('.sidebar-link');
        if (link && link.dataset.tab) {
            event.preventDefault();
            loadTab(link.dataset.tab);
        }
    });

    DOMElements.mobileMenuBtn.addEventListener('click', () => {
        DOMElements.sidebar.classList.toggle('-translate-x-full');
    });

    DOMElements.closeShareModalBtn.addEventListener('click', () => DOMElements.shareModal.classList.add('hidden'));
    document.getElementById('copy-link-button').addEventListener('click', () => {
        const linkInput = document.getElementById('invite-link');
        linkInput.select();
        document.execCommand('copy');
    });
}

function setupAuthObserver() {
    auth.onAuthStateChanged(user => {
        const isAuthorized = user && adminEmails.includes(user.email);
        
        if (isAuthorized) {
            DOMElements.adminDashboard.classList.remove('hidden');
            DOMElements.loginScreen.classList.add('hidden');
            DOMElements.adminEmailEl.textContent = user.email;
            loadTab(state.currentTab);
        } else {
            DOMElements.loginScreen.classList.remove('hidden');
            DOMElements.adminDashboard.classList.add('hidden');
            if (user) {
                auth.signOut();
            }
        }
    });
}


function initAdminDashboard() {
    DOMElements.sidebarNav.innerHTML = UI.renderSidebarNav();
    setupEventListeners();
    setupAuthObserver();
}

// Inicia a aplicação do painel de admin
initAdminDashboard();
