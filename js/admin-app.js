// js/admin-app.js

import * as UI from './admin-ui.js';
import { adminEmails } from './config.js';
import { auth, db } from './firebase-service.js';

// --- Estado da Aplicação Admin ---
const adminState = {
    currentTab: 'details',
    keysUnsubscribe: null,
    reportUnsubscribe: null,
    guestbookUnsubscribe: null,
    giftsUnsubscribe: null,
    adminGalleryUnsubscribe: null,
};

// --- Elementos da DOM ---
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const googleLoginBtn = document.getElementById('google-login-button');
const logoutBtn = document.getElementById('logout-button');
const adminEmailEl = document.getElementById('admin-email');
const tabContent = document.getElementById('tab-content');
const tabs = document.querySelectorAll('.tab-button');

// --- Funções de Lógica e Eventos ---

function handleGoogleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        const loginErrorEl = document.getElementById('login-error');
        loginErrorEl.textContent = "Erro ao fazer login com Google.";
        loginErrorEl.classList.remove('hidden');
    });
}

function handleTabClick(event) {
    loadTab(event.currentTarget.dataset.tab);
}

async function handleSaveDetails(event) {
    event.preventDefault();
    const successMsg = document.getElementById('details-success');
    const updatedDetails = {
        coupleNames: document.getElementById('form-couple-names').value,
        weddingDate: new Date(document.getElementById('form-wedding-date').value),
        rsvpDate: new Date(document.getElementById('form-rsvp-date').value),
        venue: document.getElementById('form-venue').value,
        dressCode: document.getElementById('form-dress-code').value,
    };
    await db.collection('siteConfig').doc('details').update(updatedDetails);
    successMsg.classList.remove('hidden');
    setTimeout(() => successMsg.classList.add('hidden'), 3000);
}

async function handleGenerateKey() {
    const guestName = document.getElementById('guest-name').value.trim();
    const inviteType = document.getElementById('invite-type').value;
    const allowedGuests = parseInt(document.getElementById('allowed-guests').value, 10);
    const resultEl = document.getElementById('key-result');

    if (!guestName || !allowedGuests || allowedGuests < 1) {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }
    
    const newKey = 'AS' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // CORREÇÃO: Usa a chave como ID do documento
    await db.collection('accessKeys').doc(newKey).set({
        guestName,
        inviteType,
        allowedGuests,
        isUsed: false,
        usedByEmail: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    resultEl.innerHTML = `
        <p class="text-sm">Chave para <strong>${guestName}</strong>:</p>
        <p class="font-mono text-lg">${newKey}</p>
        <p class="text-xs text-gray-600">(${allowedGuests} pessoa(s))</p>`;
    resultEl.classList.remove('hidden');
    document.getElementById('guest-name').value = '';
}

async function handleDeleteMessage(event) {
    const button = event.currentTarget;
    const messageId = button.dataset.id;
    if (confirm('Tem certeza que deseja apagar esta mensagem?')) {
        await db.collection('guestbook').doc(messageId).delete();
    }
}

async function handleAddGift(event) {
    event.preventDefault();
    const form = event.target;
    const name = document.getElementById('gift-name').value;
    const description = document.getElementById('gift-description').value;
    const imageUrl = document.getElementById('gift-image-url').value;
    await db.collection('giftList').add({
        name, description, imageUrl, isTaken: false, takenBy: null
    });
    form.reset();
}

async function handleDeleteGift(event) {
    const giftId = event.currentTarget.dataset.id;
    if (confirm('Tem certeza que deseja apagar este presente?')) {
        await db.collection('giftList').doc(giftId).delete();
    }
}

async function handleEditGift(event) {
    const giftId = event.currentTarget.dataset.id;
    const giftDoc = await db.collection('giftList').doc(giftId).get();
    const gift = giftDoc.data();
    const newName = prompt("Editar nome do presente:", gift.name);
    const newImageUrl = prompt("Editar URL da imagem:", gift.imageUrl);
    if (newName !== null && newImageUrl !== null) {
        await db.collection('giftList').doc(giftId).update({ name: newName, imageUrl: newImageUrl });
    }
}

async function handleDeleteKey(event) {
    const keyId = event.currentTarget.dataset.id;
    if (confirm('Tem certeza que deseja apagar este convite? Se o convidado já se cadastrou, a conta dele não será apagada, mas o registro do convite sim.')) {
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
    if (confirm('Tem certeza que deseja apagar esta foto da galeria?')) {
        await db.collection('guestPhotos').doc(photoId).delete();
    }
}


// --- Funções Principais de Carregamento ---

function setActiveTab(tabName) {
    tabs.forEach(tab => {
        const isSelected = tab.dataset.tab === tabName;
        tab.classList.toggle('border-blue-600', isSelected);
        tab.classList.toggle('text-blue-600', isSelected);
        tab.classList.toggle('border-transparent', !isSelected);
        tab.classList.toggle('text-gray-500', !isSelected);
    });
}

async function loadTab(tabName) {
    adminState.currentTab = tabName;
    setActiveTab(tabName);
    tabContent.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>`;

    // Cancela listeners antigos
    if (adminState.keysUnsubscribe) adminState.keysUnsubscribe();
    if (adminState.reportUnsubscribe) adminState.reportUnsubscribe();
    if (adminState.guestbookUnsubscribe) adminState.guestbookUnsubscribe();
    if (adminState.giftsUnsubscribe) adminState.giftsUnsubscribe();
    if (adminState.adminGalleryUnsubscribe) adminState.adminGalleryUnsubscribe();

    if (tabName === 'details') {
        const details = (await db.collection('siteConfig').doc('details').get()).data();
        tabContent.innerHTML = UI.renderDetailsEditor(details);
        document.getElementById('details-form').addEventListener('submit', handleSaveDetails);
    } else if (tabName === 'keys') {
        tabContent.innerHTML = UI.renderKeyManager();
        document.getElementById('generate-key-button').addEventListener('click', handleGenerateKey);
        document.getElementById('invite-type').addEventListener('change', (e) => {
            document.getElementById('allowed-guests').readOnly = e.target.value === 'individual';
            if (e.target.value === 'individual') document.getElementById('allowed-guests').value = 1;
        });
        adminState.keysUnsubscribe = db.collection('accessKeys').orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                UI.updateKeysList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.edit-key-btn').forEach(btn => btn.addEventListener('click', handleEditKey));
                document.querySelectorAll('.delete-key-btn').forEach(btn => btn.addEventListener('click', handleDeleteKey));
            });
    } else if (tabName === 'report') {
        tabContent.innerHTML = UI.renderGuestsReport();
        adminState.reportUnsubscribe = db.collection('accessKeys').where('isUsed', '==', true).orderBy('usedAt', 'desc')
            .onSnapshot(snap => UI.updateGuestsReport(snap.docs.map(d => d.data())));
    } else if (tabName === 'guestbook') {
        tabContent.innerHTML = UI.renderGuestbookAdmin();
        adminState.guestbookUnsubscribe = db.collection('guestbook').orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                UI.updateGuestbookAdminList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.delete-message-btn').forEach(btn => btn.addEventListener('click', handleDeleteMessage));
            });
    } else if (tabName === 'gifts') {
        tabContent.innerHTML = UI.renderGiftsManager();
        document.getElementById('add-gift-form').addEventListener('submit', handleAddGift);
        adminState.giftsUnsubscribe = db.collection('giftList').orderBy('name')
            .onSnapshot(snap => {
                UI.updateGiftsAdminList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.edit-gift-btn').forEach(btn => btn.addEventListener('click', handleEditGift));
                document.querySelectorAll('.delete-gift-btn').forEach(btn => btn.addEventListener('click', handleDeleteGift));
            });
    } else if (tabName === 'admin-gallery') {
        tabContent.innerHTML = UI.renderAdminGallery();
        adminState.adminGalleryUnsubscribe = db.collection('guestPhotos').orderBy('createdAt', 'desc')
            .onSnapshot(snap => {
                UI.updateAdminGallery(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.delete-photo-btn').forEach(btn => btn.addEventListener('click', handleDeletePhoto));
            });
    }
}

function initAdmin() {
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    logoutBtn.addEventListener('click', () => auth.signOut());
    tabs.forEach(tab => tab.addEventListener('click', handleTabClick));

    auth.onAuthStateChanged(user => {
        if (user && adminEmails.includes(user.email)) {
            loginScreen.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
            adminEmailEl.textContent = user.email;
            loadTab(adminState.currentTab);
        } else {
            if (user) auth.signOut();
            loginScreen.classList.remove('hidden');
            adminDashboard.classList.add('hidden');
        }
    });
}

// Inicia a aplicação do painel de admin
initAdmin();
