// js/firebase-service.js

import { cloudinaryConfig, firebaseConfig } from './config.js';

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Exporta os serviços do Firebase para serem usados em outros módulos
export const auth = firebase.auth();
export const db = firebase.firestore();
// O Firebase Storage não é mais exportado ou usado para uploads
// export const storage = firebase.storage();

/**
 * Inicia o fluxo de login com o popup do Google.
 * @returns {Promise<firebase.auth.UserCredential>}
 */
export function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
}

/**
 * Busca os detalhes do casamento do Firestore.
 * @returns {Promise<Object|null>}
 */
export async function getWeddingDetails() {
    try {
        const docRef = db.collection('siteConfig').doc('details');
        const docSnap = await docRef.get();
        // CORREÇÃO: Alterado de docSnap.exists() para docSnap.exists
        if (docSnap.exists) {
            const data = docSnap.data();
            // Converte Timestamps do Firestore para objetos Date do JS
            return {
                ...data,
                weddingDate: data.weddingDate.toDate(),
                rsvpDate: data.rsvpDate.toDate()
            };
        } else {
            console.log("No wedding details found in DB!");
            return null;
        }
    } catch (error) {
        console.error("Error fetching wedding details:", error);
        return null;
    }
}

/**
 * Valida uma chave de acesso no Firestore.
 * @param {string} key - A chave de acesso a ser validada.
 * @returns {Promise<{isValid: boolean, isUsed: boolean, docId: string|null, data: Object|null}>}
 */
export async function validateAccessKey(key) {
    const docRef = db.collection('accessKeys').doc(key);
    const docSnap = await docRef.get();
    
    // CORREÇÃO: Alterado de docSnap.exists() para docSnap.exists
    if (!docSnap.exists) {
        return { isValid: false, isUsed: false, docId: null, data: null };
    }
    
    const docData = docSnap.data();
    return {
        isValid: true,
        isUsed: docData.isUsed,
        docId: docSnap.id, // O ID do documento é a própria chave
        data: docData
    };
}

/**
 * Realiza o login do usuário.
 * @param {string} email - O email do usuário.
 * @param {string} password - A senha do usuário.
 * @returns {Promise<firebase.auth.UserCredential>}
 */
export function loginUser(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

/**
 * Cadastra um novo usuário e salva os nomes dos convidados.
 * @param {Object} userData - Dados do usuário {name, email, password, keyDocId, guestNames}.
 * @returns {Promise<void>}
 */
export async function signupUser({ name, email, password, keyDocId, guestNames }) {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });
    
    // Salva os nomes dos convidados em uma subcoleção
    const keyRef = db.collection('accessKeys').doc(keyDocId);
    const guestNamesCollectionRef = keyRef.collection('guestNames');
    for (const guestName of guestNames) {
        if (guestName.trim() !== '') {
            await guestNamesCollectionRef.add({ name: guestName });
        }
    }

    // Marca a chave como usada
    await keyRef.update({
        isUsed: true,
        usedByEmail: email,
        usedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Faz o upload de uma foto para o Cloudinary.
 * @param {File} file - O arquivo da foto.
 * @param {firebase.User} user - O usuário autenticado.
 * @param {function} onProgress - Callback para o progresso do upload.
 * @returns {Promise<void>}
 */
export async function uploadPhoto(file, user, onProgress) {
    const url = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

    // Simula o progresso, pois a API Fetch não suporta progresso de upload nativamente
    onProgress(25); // Inicia o progresso

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        
        onProgress(75); // Meio do progresso

        if (!response.ok) {
            throw new Error('Upload to Cloudinary failed');
        }

        const data = await response.json();
        const imageUrl = data.secure_url; // URL segura da imagem no Cloudinary

        // Salva a URL da imagem no Firestore
        await db.collection('guestPhotos').add({
            imageUrl: imageUrl,
            userName: user.displayName,
            userId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        onProgress(100); // Conclui o progresso
    } catch (error) {
        console.error("Upload error:", error);
        onProgress(0); // Reseta o progresso em caso de erro
        throw error; // Propaga o erro para ser tratado no app.js
    }
}

/**
 * Escuta por novas fotos na galeria em tempo real.
 * @param {function} onPhotosUpdate - Callback que recebe a lista de fotos.
 * @returns {function} - Função para cancelar a inscrição (unsubscribe).
 */
export function listenToGuestPhotos(onPhotosUpdate) {
    return db.collection('guestPhotos').orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onPhotosUpdate(photos);
        }, error => {
            console.error("Error listening to photos:", error);
            onPhotosUpdate([]); // Retorna array vazio em caso de erro
        });
}

/**
 * Deleta o registro de uma foto no Firestore.
 * @param {string} photoId - O ID do documento da foto no Firestore.
 * @returns {Promise<void>}
 */
export function deletePhotoRecord(photoId) {
    return db.collection('guestPhotos').doc(photoId).delete();
}


/**
 * Adiciona uma nova mensagem ao mural de recados.
 * @param {firebase.User} user - O usuário que está postando.
 * @param {string} message - A mensagem.
 * @returns {Promise<void>}
 */
export function postGuestbookMessage(user, message) {
    return db.collection('guestbook').add({
        userName: user.displayName,
        userId: user.uid,
        message: message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Escuta por novas mensagens no mural de recados.
 * @param {function} onMessagesUpdate - Callback que recebe a lista de mensagens.
 * @returns {function} - Função para cancelar a inscrição (unsubscribe).
 */
export function listenToGuestbookMessages(onMessagesUpdate) {
    return db.collection('guestbook').orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onMessagesUpdate(messages);
        }, error => {
            console.error("Error listening to guestbook messages:", error);
            onMessagesUpdate([]);
        });
}

/**
 * Deleta uma mensagem do mural de recados.
 * @param {string} messageId - O ID da mensagem a ser deletada.
 * @returns {Promise<void>}
 */
export function deleteGuestbookMessage(messageId) {
    return db.collection('guestbook').doc(messageId).delete();
}

/**
 * Escuta a lista de presentes em tempo real.
 * @param {function} onGiftsUpdate - Callback que recebe a lista de presentes.
 * @returns {function} - Função para cancelar a inscrição.
 */
export function listenToGiftList(onGiftsUpdate) {
    return db.collection('giftList').orderBy('name').onSnapshot(snapshot => {
        const gifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onGiftsUpdate(gifts);
    });
}

/**
 * Marca um presente como escolhido.
 * @param {string} giftId - O ID do presente.
 * @param {firebase.User} user - O usuário que escolheu.
 * @returns {Promise<void>}
 */
export function markGiftAsTaken(giftId, user) {
    return db.collection('giftList').doc(giftId).update({
        isTaken: true,
        takenBy: user.displayName
    });
}

/**
 * Desmarca um presente (caso o usuário desfaça a ação).
 * @param {string} giftId - O ID do presente.
 * @returns {Promise<void>}
 */
export function unmarkGiftAsTaken(giftId) {
    return db.collection('giftList').doc(giftId).update({
        isTaken: false,
        takenBy: null
    });
}
