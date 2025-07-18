// js/firebase-service.js

import { firebaseConfig } from './config.js';

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Exporta os serviços do Firebase para serem usados em outros módulos
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();

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
 * @returns {Promise<{isValid: boolean, isUsed: boolean, docId: string|null}>}
 */
export async function validateAccessKey(key) {
    const keyQuery = db.collection('accessKeys').where('key', '==', key).limit(1);
    const snapshot = await keyQuery.get();
    
    if (snapshot.empty) {
        return { isValid: false, isUsed: false, docId: null };
    }
    
    const doc = snapshot.docs[0];
    return {
        isValid: true,
        isUsed: doc.data().isUsed,
        docId: doc.id
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
 * Cadastra um novo usuário.
 * @param {Object} userData - Dados do usuário {name, email, password, keyDocId}.
 * @returns {Promise<void>}
 */
export async function signupUser({ name, email, password, keyDocId }) {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });
    
    // Marca a chave como usada
    await db.collection('accessKeys').doc(keyDocId).update({
        isUsed: true,
        usedByEmail: email,
        usedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

/**
 * Faz o upload de uma foto para o Firebase Storage.
 * @param {File} file - O arquivo da foto.
 * @param {firebase.User} user - O usuário autenticado.
 * @param {function} onProgress - Callback para o progresso do upload.
 * @returns {Promise<void>}
 */
export async function uploadPhoto(file, user, onProgress) {
    const filePath = `guest_photos/${user.uid}_${Date.now()}_${file.name}`;
    const storageRef = storage.ref(filePath);
    const uploadTask = storageRef.put(file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            },
            (error) => {
                console.error("Upload error:", error);
                reject(error);
            },
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                await db.collection('guestPhotos').add({
                    imageUrl: downloadURL,
                    userName: user.displayName,
                    userId: user.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                resolve();
            }
        );
    });
}

/**
 * Escuta por novas fotos na galeria em tempo real.
 * @param {function} onPhotosUpdate - Callback que recebe a lista de fotos.
 * @returns {function} - Função para cancelar a inscrição (unsubscribe).
 */
export function listenToGuestPhotos(onPhotosUpdate) {
    return db.collection('guestPhotos').orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const photos = snapshot.docs.map(doc => doc.data());
            onPhotosUpdate(photos);
        }, error => {
            console.error("Error listening to photos:", error);
            onPhotosUpdate([]); // Retorna array vazio em caso de erro
        });
}
