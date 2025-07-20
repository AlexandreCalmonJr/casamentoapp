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
const shareModal = document.getElementById('share-modal');
const closeShareModalBtn = document.getElementById('close-share-modal');

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
    const button = document.getElementById('save-all-details-button');
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...`;
    
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
    };
    
    await db.collection('siteConfig').doc('details').update(updatedDetails);
    
    button.disabled = false;
    button.innerHTML = originalText;
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
    
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>Gerando...`;

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
    generateBtn.disabled = false;
    generateBtn.textContent = 'Gerar Convite';
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
        document.getElementById('save-all-details-button').addEventListener('click', handleSaveDetails);
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
                document.querySelectorAll('.share-key-btn').forEach(btn => btn.addEventListener('click', handleShareKey));
            });
    } else if (tabName === 'report') {
        tabContent.innerHTML = UI.renderGuestsReport();
        document.getElementById('export-csv-button').addEventListener('click', handleExportCSV);
        adminState.reportUnsubscribe = db.collection('accessKeys').where('isUsed', '==', true).orderBy('usedAt', 'desc')
            .onSnapshot(snap => {
                UI.updateGuestsReport(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                document.querySelectorAll('.report-item').forEach(item => item.addEventListener('click', handleToggleGuestNames));
            });
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

function showShareModal(guestName, key, allowedGuests, phone) {
    // CORREÇÃO: URL corrigida para o domínio atual
    const siteBaseUrl = 'https://casamentoa2.vercel.app';
    const fullLink = `${siteBaseUrl}?key=${key}`;

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
        // Limpar o número de telefone (remover caracteres especiais)
        const cleanPhone = phone.replace(/\D/g, ''); // Remove tudo que não é dígito
        
        const message = `Olá, ${guestName}! ❤️ Com muita alegria, estamos enviando o convite digital para o nosso casamento. Por favor, acesse o link abaixo para confirmar sua presença e encontrar todos os detalhes do nosso grande dia. Mal podemos esperar para celebrar com você! Com carinho, Andressa & Alexandre. ${fullLink}`;
        
        // CORREÇÃO: Usar apenas números no WhatsApp e adicionar código do país se necessário
        const phoneForWhatsapp = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const whatsappUrl = `https://wa.me/${phoneForWhatsapp}?text=${encodeURIComponent(message)}`;
        
        whatsappBtn.onclick = () => window.open(whatsappUrl, '_blank');
        whatsappBtn.classList.remove('hidden');
    } else {
        whatsappBtn.classList.add('hidden');
    }

    shareModal.classList.remove('hidden');
}

function initAdmin() {
    googleLoginBtn.addEventListener('click', handleGoogleLogin);
    logoutBtn.addEventListener('click', () => auth.signOut());
    tabs.forEach(tab => tab.addEventListener('click', handleTabClick));
    closeShareModalBtn.addEventListener('click', () => shareModal.classList.add('hidden'));
    document.getElementById('copy-link-button').addEventListener('click', () => {
        const linkInput = document.getElementById('invite-link');
        linkInput.select();
        document.execCommand('copy');
    });

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