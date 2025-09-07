// js/admin-app.js

import * as UI from './admin-ui.js';
import { adminEmails } from './config.js';
import { auth, db, uploadFileToCloudinary } from './firebase-service.js';
import { PDFGenerator } from './pdf-generator.js';

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
        
        // CORREÇÃO APLICADA AQUI
        const textTemplate = state.weddingDetails.whatsappMessageTemplate;
        const imageUrl = state.weddingDetails.whatsappInviteImageUrl;

        // Monta a parte do texto da mensagem
        let textPart = textTemplate
            .replace('{nome_convidado}', guestName)
            .replace('{nomes_casal}', state.weddingDetails.coupleNames)
            .replace('{link_convite}', fullLink);

        let finalMessage;

        if (imageUrl) {
            // Se houver uma imagem, colocamo-la primeiro, seguida pelo resto da mensagem.
            // Esta estrutura aumenta a probabilidade de o WhatsApp gerar a pré-visualização da imagem.
            finalMessage = `${imageUrl}\n\n${textPart}`;
        } else {
            finalMessage = textPart;
        }
        
        const phoneForWhatsapp = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const whatsappUrl = `https://wa.me/${phoneForWhatsapp}?text=${encodeURIComponent(finalMessage)}`;
        
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

    // NOVO: Coleta das URLs das fotos do carrossel
    const carouselPhotos = Array.from(document.querySelectorAll('#carousel-photos-preview img')).map(img => img.src);

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
        dressCodePalettes: dressCodePalettes,
        carouselPhotos: carouselPhotos, // NOVO
        venuePhoto: document.getElementById('form-venue-photo-url').value.trim(),
        whatsappInviteImageUrl: document.getElementById('form-whatsapp-image-url').value.trim() // Salva a nova imagem
    };

    await db.collection('siteConfig').doc('details').update(updatedDetails);
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

// NOVO: Funções de CRUD para a Timeline
async function handleAddTimelineEvent(event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    UI.setButtonLoading(button, true);
    const date = document.getElementById('timeline-date').value;
    const title = document.getElementById('timeline-title').value;
    const description = document.getElementById('timeline-description').value;
    const imageUrl = document.getElementById('timeline-image-url').value;
    
    await db.collection('timeline').add({ date, title, description, imageUrl, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    
    UI.setButtonLoading(button, false);
    form.reset();
}

async function handleEditTimelineEvent(event) {
    const eventId = event.currentTarget.dataset.id;
    const eventDoc = await db.collection('timeline').doc(eventId).get();
    if (!eventDoc.exists) return;
    
    UI.showEditTimelineEventModal(eventDoc.data(), async (updatedData) => {
        await db.collection('timeline').doc(eventId).update(updatedData);
        UI.closeEditModal();
    });
}

async function handleDeleteTimelineEvent(event) {
    const eventId = event.currentTarget.dataset.id;
    const confirmed = await UI.showConfirmationModal({ title: 'Apagar Evento', message: 'Tem certeza que deseja apagar este evento da timeline?' });
    if (confirmed) {
        await db.collection('timeline').doc(eventId).delete();
    }
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
        const addBtn = e.target.closest('.add-color-btn');
        if (addBtn) {
            const group = addBtn.dataset.group;
            const colorInput = addBtn.previousElementSibling;
            const newColor = colorInput.value;
            const colorsContainer = editor.querySelector(`.palette-group[data-group="${group}"] .palette-colors`);
            
            const newColorHTML = `
                <div class="relative group w-12 h-12 rounded-full border-2 border-white shadow-md" style="background-color: ${newColor};">
                    <button type="button" class="delete-color-btn absolute inset-0 bg-red-500 bg-opacity-80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" data-color="${newColor}" data-group="${group}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            colorsContainer.insertAdjacentHTML('beforeend', newColorHTML);
        }

        const deleteBtn = e.target.closest('.delete-color-btn');
        if (deleteBtn) {
            deleteBtn.closest('.relative.group').remove();
        }
    });
}

// NOVO: Listeners para gerenciar fotos na página de configurações
function setupDetailsPhotoListeners() {
    const addCarouselBtn = document.getElementById('add-carousel-photo-btn');
    const previewContainer = document.getElementById('carousel-photos-preview');

    if (addCarouselBtn) {
        addCarouselBtn.addEventListener('click', () => {
            const input = document.getElementById('new-carousel-photo-url');
            const url = input.value.trim();
            if (url) {
                const newIndex = previewContainer.children.length;
                const newPhotoHTML = `
                    <div class="relative group">
                        <img src="${url}" class="w-24 h-24 object-cover rounded-md">
                        <button type="button" class="delete-carousel-photo-btn absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100" data-index="${newIndex}">&times;</button>
                    </div>`;
                previewContainer.insertAdjacentHTML('beforeend', newPhotoHTML);
                input.value = '';
            }
        });
    }

    if (previewContainer) {
        previewContainer.addEventListener('click', (e) => {
            if (e.target.closest('.delete-carousel-photo-btn')) {
                e.target.closest('.relative.group').remove();
            }
        });
    }
}

// Função genérica para lidar com o upload de uma imagem
async function handleImageUpload(inputId, urlHiddenId, progressBarId, previewId) {
    const fileInput = document.getElementById(inputId);
    const file = fileInput.files[0];
    if (!file) return;

    const progressBar = document.getElementById(progressBarId);
    progressBar.parentElement.classList.remove('hidden');
    progressBar.style.width = '0%';

    try {
        const imageUrl = await uploadFileToCloudinary(file, (progress) => {
            progressBar.style.width = `${progress}%`;
        });
        document.getElementById(urlHiddenId).value = imageUrl;
        document.getElementById(previewId).innerHTML = `<img src="${imageUrl}" class="rounded-lg max-w-xs shadow-md">`;
    } catch (error) {
        console.error('Upload error:', error);
        alert('Erro ao fazer upload da imagem.');
    } finally {
        setTimeout(() => {
            progressBar.parentElement.classList.add('hidden');
        }, 1000);
    }
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
        setupDetailsPhotoListeners(); // NOVO
        
        // Adiciona listeners para os novos campos de upload de imagem
        document.getElementById('whatsapp-image-input').addEventListener('change', () => handleImageUpload('whatsapp-image-input', 'form-whatsapp-image-url', 'whatsapp-image-progress-bar', 'whatsapp-image-preview'));
        document.getElementById('venue-photo-input').addEventListener('change', () => handleImageUpload('venue-photo-input', 'form-venue-photo-url', 'venue-photo-progress-bar', 'venue-photo-preview'));
        
        const pdfGenerator = new PDFGenerator();
        document.querySelectorAll('[id^="preview-pdf-"]').forEach(button => {
            button.addEventListener('click', async (e) => {
                const role = e.currentTarget.dataset.role;
                const detailsDoc = await db.collection('siteConfig').doc('details').get();
                const currentDetails = detailsDoc.data();
                if (currentDetails) {
                    await pdfGenerator.generateDressCodePDF(currentDetails, role, currentDetails.dressCodePalettes);
                }
            });
        });

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
    
    // NOVO: Lógica para a aba Timeline
    } else if (tabName === 'timeline') {
        DOMElements.tabContent.innerHTML = UI.renderTimelineManager();
        document.getElementById('add-timeline-event-form').addEventListener('submit', handleAddTimelineEvent);
        state.unsubscribe.timeline = db.collection('timeline').orderBy('date', 'desc').onSnapshot(snap => {
            UI.updateTimelineEventsList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            document.querySelectorAll('.edit-timeline-event-btn').forEach(btn => btn.addEventListener('click', handleEditTimelineEvent));
            document.querySelectorAll('.delete-timeline-event-btn').forEach(btn => btn.addEventListener('click', handleDeleteTimelineEvent));
        });

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
            if (detailsDoc.exists) {
                const data = detailsDoc.data();
                state.weddingDetails = {
                    ...data,
                    weddingDate: data.weddingDate.toDate(),
                    rsvpDate: data.rsvpDate.toDate()
                };
            }
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