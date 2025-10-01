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

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// *** NOVO ***: Função auxiliar para copiar texto para a área de transferência
function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
        // Fallback para navegadores mais antigos
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; // Evita que a página "salte"
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            UI.showToast('Texto do convite copiado!', 'success');
        } catch (err) {
            console.error('Fallback: Não foi possível copiar o texto', err);
        }
        document.body.removeChild(textArea);
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        UI.showToast('Texto do convite copiado!', 'success');
    }).catch(err => {
        console.error('Não foi possível copiar o texto: ', err);
    });
}


// *** ATUALIZADO ***: Lógica de partilha revista para telemóvel e computador
async function showShareModalWithImage(guestName, key, allowedGuests, phone) {
    const siteBaseUrl = window.location.origin;
    const fullLink = `${siteBaseUrl}/index.html?key=${key}`;
    
    document.getElementById('modal-guest-name').textContent = guestName;
    document.getElementById('modal-allowed-guests').textContent = allowedGuests;
    document.getElementById('invite-link').value = fullLink;
    
    // QR Code
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

    const shareActionsContainer = document.getElementById('share-actions-container');
    shareActionsContainer.innerHTML = '';

    if (phone && state.weddingDetails?.whatsappMessageTemplate) {
        const cleanPhone = phone.replace(/\D/g, '');
        const phoneForWhatsapp = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const message = state.weddingDetails.whatsappMessageTemplate
            .replace('{nome_convidado}', guestName)
            .replace('{nomes_casal}', state.weddingDetails.coupleNames)
            .replace('{link_convite}', fullLink);

        let useNativeShare = isMobile() && state.weddingDetails.shareImage && navigator.share && navigator.canShare;
        let nativeShareReady = false;

        if (useNativeShare) {
            try {
                const response = await fetch(state.weddingDetails.shareImage);
                const blob = await response.blob();
                const imageFile = new File([blob], 'convite.jpg', { type: blob.type });
                
                // *** LÓGICA DE PARTILHA MÓVEL CORRIGIDA ***
                // Agora partilhamos APENAS o ficheiro e copiamos o texto.
                const shareData = {
                    files: [imageFile],
                    title: `Convite - ${state.weddingDetails.coupleNames}`,
                };
                
                if (navigator.canShare(shareData)) {
                    shareActionsContainer.innerHTML = `
                        <button id="native-share-button" class="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center justify-center">
                            <i class="fas fa-share-alt mr-2"></i>Enviar Convite
                        </button>
                    `;
                    document.getElementById('native-share-button').onclick = async () => {
                        try {
                            // Copia o texto primeiro
                            copyTextToClipboard(message);
                            // Depois abre a partilha da imagem
                            await navigator.share(shareData);
                        } catch (error) {
                            if (error.name !== 'AbortError') {
                                console.error('Erro na partilha nativa:', error);
                            }
                        }
                    };
                    nativeShareReady = true;
                }
            } catch (e) {
                console.error("Não foi possível carregar a imagem para partilha nativa:", e);
                nativeShareReady = false;
            }
        }

        // Fallback para Computador ou se a partilha nativa falhar
        if (!nativeShareReady) {
            const whatsappUrl = `https://wa.me/${phoneForWhatsapp}?text=${encodeURIComponent(message)}`;
            let fallbackHtml = `
                <p class="text-xs text-center text-gray-500 mb-2 font-semibold">Opções de Envio:</p>
                ${state.weddingDetails.shareImage ? `
                    <a href="${state.weddingDetails.shareImage}" download="convite.jpg" class="mb-2 block w-full py-2 px-4 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm flex items-center justify-center">
                        <i class="fas fa-download mr-2"></i>1. Baixar Imagem
                    </a>
                ` : ''}
                <a href="${whatsappUrl}" target="_blank" class="block w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center justify-center">
                    <i class="fab fa-whatsapp mr-2"></i>${state.weddingDetails.shareImage ? '2. Abrir WhatsApp' : 'Enviar via WhatsApp'}
                </a>
                ${state.weddingDetails.shareImage ? `<p class="text-xs text-center text-gray-500 mt-2">Depois, anexe a imagem baixada na conversa.</p>` : ''}
            `;
            shareActionsContainer.innerHTML = fallbackHtml;
        }
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
        carouselPhotos: carouselPhotos,
        venuePhoto: document.getElementById('form-venue-photo-url').value.trim(),
        shareImage: document.getElementById('form-share-image-url').value.trim() || null,
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
    
    showShareModalWithImage(guestName, newKey, allowedGuests, guestPhone);
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
    showShareModalWithImage(keyData.guestName, keyData.id, keyData.allowedGuests, keyData.guestPhone);
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

async function setupShareImageListeners() {
    const fileInput = document.getElementById('share-image-input');
    const removeBtn = document.getElementById('remove-share-image-btn');
    
    if (!fileInput) return;
    
    fileInput.addEventListener('change', async () => {
        await handleImageUpload(
            'share-image-input',
            'form-share-image-url',
            'share-image-progress-bar',
            'share-image-preview'
        );
        
        const previewContainer = document.getElementById('share-image-preview');
        const imageUrl = document.getElementById('form-share-image-url').value;
        
        if (imageUrl) {
            previewContainer.innerHTML = `
                <div class="relative inline-block">
                    <img src="${imageUrl}"
                         class="rounded-lg max-w-sm shadow-lg border-4 border-green-100"
                         alt="Imagem de compartilhamento">
                    <div class="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center">
                        <i class="fas fa-check-circle mr-1"></i>Ativa
                    </div>
                </div>
                <div class="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p class="text-sm text-green-700 flex items-center">
                        <i class="fas fa-whatsapp text-green-600 mr-2"></i>
                        Esta imagem será enviada ao compartilhar convites no WhatsApp
                    </p>
                </div>
            `;
            
            const uploadButton = document.querySelector('[onclick="document.getElementById(\'share-image-input\').click()"]');
            if (uploadButton && !document.getElementById('remove-share-image-btn')) {
                const removeButton = document.createElement('button');
                removeButton.type = 'button';
                removeButton.id = 'remove-share-image-btn';
                removeButton.className = 'py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors';
                removeButton.innerHTML = '<i class="fas fa-trash mr-2"></i>Remover';
                uploadButton.parentElement.insertBefore(removeButton, uploadButton.nextSibling);
                removeButton.addEventListener('click', handleRemoveShareImage);
            }
            
            if (uploadButton) {
                uploadButton.innerHTML = '<i class="fas fa-upload mr-2"></i>Trocar Imagem';
            }
        }
    });
    
    if (removeBtn) {
        removeBtn.addEventListener('click', handleRemoveShareImage);
    }
}

async function handleRemoveShareImage() {
    const confirmed = await UI.showConfirmationModal({
        title: 'Remover Imagem?',
        message: 'A imagem personalizada será removida. Uma imagem automática será gerada ao compartilhar.',
        confirmText: 'Remover',
        isDestructive: true
    });
    
    if (!confirmed) return;
    
    document.getElementById('form-share-image-url').value = '';
    
    const previewContainer = document.getElementById('share-image-preview');
    previewContainer.innerHTML = `
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <i class="fas fa-image text-5xl text-gray-300 mb-3"></i>
            <p class="text-sm font-medium text-gray-600 mb-1">Nenhuma imagem personalizada</p>
            <p class="text-xs text-gray-500">
                Uma imagem será gerada automaticamente ao compartilhar.
            </p>
        </div>
    `;
    
    const removeBtn = document.getElementById('remove-share-image-btn');
    if (removeBtn) removeBtn.remove();
    
    const uploadButton = document.querySelector('[onclick="document.getElementById(\'share-image-input\').click()"]');
    if (uploadButton) {
        uploadButton.innerHTML = '<i class="fas fa-upload mr-2"></i>Escolher Imagem';
    }
    
    UI.showToast('Imagem removida. Salve as alterações para confirmar.', 'info');
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
        setupDetailsPhotoListeners();
        
        document.getElementById('venue-photo-input').addEventListener('change', () => handleImageUpload('venue-photo-input', 'form-venue-photo-url', 'venue-photo-progress-bar', 'venue-photo-preview'));
        
        setupShareImageListeners();

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