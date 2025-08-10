// js/admin-app.js

import * as UI from './admin-ui.js';
import { adminEmails } from './config.js';
import { auth, db } from './firebase-service.js';

const state = {
    currentTab: 'report',
    unsubscribe: {}, 
    weddingDetails: null,
    reportChart: null,
};

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

function showShareModal(guestName, key, allowedGuests, phone) {
    const siteBaseUrl = window.location.origin;
    const fullLink = `${siteBaseUrl}/index.html?key=${key}`;
    document.getElementById('modal-guest-name').textContent = guestName;
    document.getElementById('modal-allowed-guests').textContent = allowedGuests;
    document.getElementById('invite-link').value = fullLink;
    const qrCodeContainer = document.getElementById('qrcode');
    qrCodeContainer.innerHTML = '';
    new QRCode(qrCodeContainer, {
        text: fullLink, width: 192, height: 192,
        colorDark: "#000000", colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    setTimeout(() => {
        const canvas = qrCodeContainer.querySelector('canvas');
        if (canvas) document.getElementById('download-qr-button').href = canvas.toDataURL();
    }, 100);
    const whatsappBtn = document.getElementById('whatsapp-share-button');
    if (phone && state.weddingDetails?.whatsappMessageTemplate) {
        const cleanPhone = phone.replace(/\D/g, '');
        const message = state.weddingDetails.whatsappMessageTemplate
            .replace('{nome_convidado}', guestName)
            .replace('{nomes_casal}', state.weddingDetails.coupleNames)
            .replace('{link_convite}', fullLink);
        const phoneForWhatsapp = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const whatsappUrl = `https://wa.me/${phoneForWhatsapp}?text=${encodeURIComponent(message)}`;
        whatsappBtn.onclick = () => window.open(whatsappUrl, '_blank');
        whatsappBtn.classList.remove('hidden');
    } else {
        whatsappBtn.classList.add('hidden');
    }
    DOMElements.shareModal.classList.remove('hidden');
}

function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        document.getElementById('login-error').textContent = "Erro ao fazer login com Google.";
        document.getElementById('login-error').classList.remove('hidden');
    });
}

async function handleSaveDetails(event) {
    const button = event.currentTarget;
    UI.setButtonLoading(button, true);

    const dressCodePalettes = {};
    document.querySelectorAll('.palette-group').forEach(groupEl => {
        const groupName = groupEl.dataset.group;
        const colors = [];
        groupEl.querySelectorAll('.delete-color-btn').forEach(btn => {
            colors.push(btn.dataset.color);
        });
        dressCodePalettes[groupName] = colors;
    });

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
        pixKey: document.getElementById('form-pix-key').value.trim(),
        whatsappMessageTemplate: document.getElementById('form-whatsapp-template').value.trim(),
        dressCodePalettes: dressCodePalettes
    };

    await db.collection('siteConfig').doc('details').update(updatedDetails);
    // ATUALIZA O ESTADO LOCAL COM OS NOVOS DADOS PARA EVITAR RECARREGAMENTO
    state.weddingDetails = { ...state.weddingDetails, ...updatedDetails };
    
    UI.setButtonLoading(button, false);
    const successMsg = document.getElementById('details-success');
    successMsg.classList.remove('hidden');
    setTimeout(() => successMsg.classList.add('hidden'), 3000);
}

async function handleGenerateKey() {
    const guestName = document.getElementById('guest-name').value.trim();
    const guestPhone = document.getElementById('guest-phone').value.trim();
    const guestRole = document.getElementById('guest-role').value;
    const allowedGuests = parseInt(document.getElementById('allowed-guests').value, 10);
    const generateBtn = document.getElementById('generate-key-button');

    if (!guestName || !allowedGuests || allowedGuests < 1) {
        alert("Por favor, preencha o nome e o número de pessoas.");
        return;
    }
    
    UI.setButtonLoading(generateBtn, true);
    const newKey = 'AS' + Math.random().toString(36).substring(2, 10).toUpperCase();
    await db.collection('accessKeys').doc(newKey).set({
        guestName,
        guestPhone,
        role: guestRole,
        allowedGuests,
        isUsed: false,
        usedByEmail: null,
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
    const confirmed = await UI.showConfirmationModal({ title: 'Apagar Mensagem', message: 'Tem certeza que deseja apagar esta mensagem permanentemente?' });
    if (confirmed) await db.collection('guestbook').doc(messageId).delete();
}

async function handleAddGift(event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    UI.setButtonLoading(button, true);
    const name = document.getElementById('gift-name').value;
    const description = document.getElementById('gift-description').value;
    const imageUrl = document.getElementById('gift-image-url').value;
    const price = parseFloat(document.getElementById('gift-price').value) || 0;
    await db.collection('giftList').add({ name, description, imageUrl, price, isTaken: false, takenBy: null });
    UI.setButtonLoading(button, false);
    form.reset();
}

async function handleDeleteGift(event) {
    const giftId = event.currentTarget.dataset.id;
    const confirmed = await UI.showConfirmationModal({ title: 'Apagar Presente', message: 'Tem certeza que deseja apagar este presente da lista?' });
    if (confirmed) await db.collection('giftList').doc(giftId).delete();
}

async function handleEditGift(event) {
    const giftId = event.currentTarget.dataset.id;
    const giftDoc = await db.collection('giftList').doc(giftId).get();
    UI.showEditGiftModal(giftDoc.data(), async (updatedData) => {
        await db.collection('giftList').doc(giftId).update(updatedData);
        UI.closeEditModal();
    });
}

async function handleDeleteKey(event) {
    const keyId = event.currentTarget.dataset.id;
    const confirmed = await UI.showConfirmationModal({ title: 'Apagar Convite', message: 'Se o convidado já se cadastrou, a conta dele não será apagada. Continuar?' });
    if (confirmed) await db.collection('accessKeys').doc(keyId).delete();
}

async function handleEditKey(event) {
    const keyId = event.currentTarget.dataset.id;
    const keyDoc = await db.collection('accessKeys').doc(keyId).get();
    UI.showEditKeyModal({ id: keyDoc.id, ...keyDoc.data() }, async (updatedData) => {
        await db.collection('accessKeys').doc(keyId).update(updatedData);
        UI.closeEditModal();
    });
}

async function handleDeletePhoto(event) {
    const photoId = event.currentTarget.dataset.id;
    const confirmed = await UI.showConfirmationModal({ title: 'Apagar Foto', message: 'Tem certeza que deseja apagar esta foto da galeria?' });
    if (confirmed) await db.collection('guestPhotos').doc(photoId).delete();
}

async function handleToggleGuestNames(event) {
    const keyId = event.currentTarget.dataset.id;
    const listContainer = document.getElementById(`guest-names-list-${keyId}`);
    if (!listContainer) return;
    const isHidden = listContainer.classList.contains('hidden');
    if (isHidden) {
        listContainer.classList.remove('hidden');
        const snapshot = await db.collection('accessKeys').doc(keyId).collection('guestNames').get();
        listContainer.innerHTML = snapshot.empty
            ? `<p class="text-xs text-gray-500">Nomes não informados.</p>`
            : `<ul class="text-sm text-gray-600 list-disc list-inside">${snapshot.docs.map(doc => `<li>${doc.data().name}</li>`).join('')}</ul>`;
    } else {
        listContainer.classList.add('hidden');
    }
}

async function handleExportCSV() {
    const snapshot = await db.collection('accessKeys').where('isUsed', '==', true).get();
    if (snapshot.empty) return alert("Nenhum convidado cadastrado para exportar.");
    let csvContent = "data:text/csv;charset=utf-8,Convidado Principal,Email,Total de Pessoas,Vai ao Restaurante,Nomes dos Acompanhantes\r\n";
    for (const doc of snapshot.docs) {
        const key = doc.data();
        const namesSnapshot = await db.collection('accessKeys').doc(doc.id).collection('guestNames').get();
        const guestNames = namesSnapshot.docs.map(d => d.data().name).join('; ');
        csvContent += [`"${key.guestName}"`, key.usedByEmail, key.allowedGuests, key.willAttendRestaurant ? "Sim" : "Não", `"${guestNames}"`].join(',') + "\r\n";
    }
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "relatorio_convidados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleShareKey(event) {
    const keyData = JSON.parse(event.currentTarget.dataset.key);
    showShareModal(keyData.guestName, keyData.id, keyData.allowedGuests, keyData.guestPhone);
}

function cleanupListeners() {
    Object.values(state.unsubscribe).forEach(unsub => { if (typeof unsub === 'function') unsub(); });
    state.unsubscribe = {};
    if (state.reportChart) {
        state.reportChart.destroy();
        state.reportChart = null;
    }
}

function setupPaletteEditorListeners() {
    const editor = document.getElementById('palette-editor');
    if (!editor) return;

    editor.addEventListener('click', (e) => {
        if (e.target.closest('.add-color-btn')) {
            const button = e.target.closest('.add-color-btn');
            const group = button.dataset.group;
            const colorInput = button.previousElementSibling;
            const newColor = colorInput.value;
            const colorsContainer = editor.querySelector(`.palette-group[data-group="${group}"] .palette-colors`);
            
            const newColorHTML = `
                <div class="relative group w-12 h-12 rounded-full border-2 border-white shadow-md" style="background-color: ${newColor};">
                    <button class="delete-color-btn absolute inset-0 bg-red-500 bg-opacity-80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-color="${newColor}" data-group="${group}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            colorsContainer.insertAdjacentHTML('beforeend', newColorHTML);
        }

        if (e.target.closest('.delete-color-btn')) {
            e.target.closest('.relative.group').remove();
        }
    });
}

async function loadTab(tabName) {
    state.currentTab = tabName;
    UI.setActiveSidebarLink(tabName);
    DOMElements.tabContent.innerHTML = UI.renderLoadingSpinner();
    if (window.innerWidth < 1024) DOMElements.sidebar.classList.add('-translate-x-full');
    cleanupListeners();

    if (tabName === 'details') {
        DOMElements.tabContent.innerHTML = UI.renderDetailsEditor(state.weddingDetails);
        document.getElementById('save-all-details-button').addEventListener('click', handleSaveDetails);
        setupPaletteEditorListeners();
    } else if (tabName === 'keys') {
        DOMElements.tabContent.innerHTML = UI.renderKeyManager();
        document.getElementById('generate-key-button').addEventListener('click', handleGenerateKey);
        
        const searchInput = document.getElementById('search-keys-input');
        const renderKeys = (docs) => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredDocs = searchTerm ? docs.filter(doc => doc.data().guestName.toLowerCase().includes(searchTerm)) : docs;
            UI.updateKeysList(filteredDocs.map(d => ({ id: d.id, ...d.data() })));
            document.querySelectorAll('.edit-key-btn').forEach(btn => btn.addEventListener('click', handleEditKey));
            document.querySelectorAll('.delete-key-btn').forEach(btn => btn.addEventListener('click', handleDeleteKey));
            document.querySelectorAll('.share-key-btn').forEach(btn => btn.addEventListener('click', handleShareKey));
        };
        state.unsubscribe.keys = db.collection('accessKeys').orderBy('createdAt', 'desc').onSnapshot(snap => renderKeys(snap.docs));
        searchInput.addEventListener('input', () => db.collection('accessKeys').orderBy('createdAt', 'desc').get().then(snap => renderKeys(snap.docs)));
    } else if (tabName === 'report') {
        DOMElements.tabContent.innerHTML = UI.renderGuestsReport();
        const searchInput = document.getElementById('search-report-input');
        const renderReport = (docs) => {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredDocs = searchTerm ? docs.filter(doc => (doc.data().guestName.toLowerCase().includes(searchTerm) || (doc.data().usedByEmail && doc.data().usedByEmail.toLowerCase().includes(searchTerm)))) : docs;
            const reportData = UI.updateGuestsReport(filteredDocs.map(d => ({ id: d.id, ...d.data() })));
            if (state.reportChart) state.reportChart.destroy();
            state.reportChart = UI.renderReportChart(reportData);
            document.querySelectorAll('.report-item').forEach(item => item.addEventListener('click', handleToggleGuestNames));
        };
        document.getElementById('export-csv-button').addEventListener('click', handleExportCSV);
        state.unsubscribe.report = db.collection('accessKeys').where('isUsed', '==', true).orderBy('usedAt', 'desc').onSnapshot(snap => renderReport(snap.docs));
        searchInput.addEventListener('input', () => db.collection('accessKeys').where('isUsed', '==', true).orderBy('usedAt', 'desc').get().then(snap => renderReport(snap.docs)));
    } else if (tabName === 'guestbook') {
        DOMElements.tabContent.innerHTML = UI.renderGuestbookAdmin();
        state.unsubscribe.guestbook = db.collection('guestbook').orderBy('createdAt', 'desc').onSnapshot(snap => {
            UI.updateGuestbookAdminList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            document.querySelectorAll('.delete-message-btn').forEach(btn => btn.addEventListener('click', handleDeleteMessage));
        });
    } else if (tabName === 'gifts') {
        DOMElements.tabContent.innerHTML = UI.renderGiftsManager();
        document.getElementById('add-gift-form').addEventListener('submit', handleAddGift);
        state.unsubscribe.gifts = db.collection('giftList').orderBy('name').onSnapshot(snap => {
            UI.updateGiftsAdminList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            document.querySelectorAll('.edit-gift-btn').forEach(btn => btn.addEventListener('click', handleEditGift));
            document.querySelectorAll('.delete-gift-btn').forEach(btn => btn.addEventListener('click', handleDeleteGift));
        });
    } else if (tabName === 'admin-gallery') {
        DOMElements.tabContent.innerHTML = UI.renderAdminGallery();
        state.unsubscribe.adminGallery = db.collection('guestPhotos').orderBy('createdAt', 'desc').onSnapshot(snap => {
            UI.updateAdminGallery(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            document.querySelectorAll('.delete-photo-btn').forEach(btn => btn.addEventListener('click', handleDeletePhoto));
        });
    }
}

function setupEventListeners() {
    DOMElements.googleLoginBtn.addEventListener('click', handleGoogleLogin);
    DOMElements.logoutBtn.addEventListener('click', () => auth.signOut());
    DOMElements.sidebarNav.addEventListener('click', (event) => {
        const link = event.target.closest('.sidebar-link');
        if (link?.dataset.tab) {
            event.preventDefault();
            loadTab(link.dataset.tab);
        }
    });
    DOMElements.mobileMenuBtn.addEventListener('click', () => DOMElements.sidebar.classList.toggle('-translate-x-full'));
    DOMElements.closeShareModalBtn.addEventListener('click', () => DOMElements.shareModal.classList.add('hidden'));
    document.getElementById('copy-link-button').addEventListener('click', () => {
        document.getElementById('invite-link').select();
        document.execCommand('copy');
    });
}

async function initializeApp() {
    DOMElements.sidebarNav.innerHTML = UI.renderSidebarNav();
    setupEventListeners();
    auth.onAuthStateChanged(async (user) => {
        const isAuthorized = user && adminEmails.includes(user.email);
        if (isAuthorized) {
            const detailsDoc = await db.collection('siteConfig').doc('details').get();
            state.weddingDetails = detailsDoc.data();
            DOMElements.adminDashboard.classList.remove('hidden');
            DOMElements.loginScreen.classList.add('hidden');
            DOMElements.adminEmailEl.textContent = user.email;
            loadTab(state.currentTab);
        } else {
            DOMElements.loginScreen.classList.remove('hidden');
            DOMElements.adminDashboard.classList.add('hidden');
            if (user) auth.signOut();
        }
    });
}

initializeApp();
