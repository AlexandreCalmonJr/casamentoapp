// js/firebase-service.js

import { cloudinaryConfig, firebaseConfig } from './config.js';

firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();

// --- Funções de Login Social ---
export function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
}
export function signInWithFacebook() {
    const provider = new firebase.auth.FacebookAuthProvider();
    provider.addScope('email');
    return auth.signInWithPopup(provider);
}
export function signInWithApple() {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    return auth.signInWithPopup(provider);
}

// --- Funções de Gamificação ---
export async function incrementEngagementScore(user, type, points) {
    if (!user) return;
    const engagementRef = db.collection('guestEngagement').doc(user.uid);

    return db.runTransaction(async (transaction) => {
        const doc = await transaction.get(engagementRef);
        
        if (!doc.exists) {
            transaction.set(engagementRef, {
                userId: user.uid,
                userName: user.displayName,
                photoURL: user.photoURL,
                photoCount: type === 'photo' ? 1 : 0,
                guestbookCount: type === 'guestbook' ? 1 : 0,
                giftCount: type === 'gift' ? 1 : 0,
                totalScore: points,
                badges: []
            });
        } else {
            const data = doc.data();
            const newPhotoCount = data.photoCount + (type === 'photo' ? 1 : 0);
            const newGuestbookCount = data.guestbookCount + (type === 'guestbook' ? 1 : 0);
            const newGiftCount = data.giftCount + (type === 'gift' ? 1 : 0);
            const newTotalScore = (data.totalScore || 0) + points;

            transaction.update(engagementRef, {
                photoCount: newPhotoCount,
                guestbookCount: newGuestbookCount,
                giftCount: newGiftCount,
                totalScore: newTotalScore,
                userName: user.displayName,
                photoURL: user.photoURL,
            });
        }
    });
}

export function listenToRanking(onUpdate) {
    return db.collection('guestEngagement')
        .orderBy('totalScore', 'desc')
        .limit(20)
        .onSnapshot(snapshot => {
            const ranking = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onUpdate(ranking);
        }, error => {
            console.error("Error listening to ranking:", error);
            onUpdate([]);
        });
}


// --- Funções do Casamento ---

export async function getWeddingDetails() {
    try {
        const docRef = db.collection('siteConfig').doc('details');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            return { ...data, weddingDate: data.weddingDate.toDate(), rsvpDate: data.rsvpDate.toDate() };
        }
        return null;
    } catch (error) {
        console.error("Error fetching wedding details:", error);
        return null;
    }
}

export async function validateAccessKey(key) {
    const docRef = db.collection('accessKeys').doc(key);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return { isValid: false, isUsed: false, docId: null, data: null };
    const docData = docSnap.data();
    return { isValid: true, isUsed: docData.isUsed, docId: docSnap.id, data: docData };
}

// ATUALIZADO: Busca pelo UID do usuário em vez do email
export async function findAccessKeyForUser(userId) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) return null;

        // Primeiro, tenta encontrar pela chave usada (por userId)
        const snapshot = await db.collection('accessKeys')
            .where('isUsed', '==', true)
            .where('usedByUserId', '==', userId)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return {
                key: doc.id,
                data: doc.data()
            };
        }

        // Se não encontrou por userId, tenta por email
        const emailSnapshot = await db.collection('accessKeys')
            .where('isUsed', '==', true)
            .where('usedByEmail', '==', currentUser.email)
            .limit(1)
            .get();

        if (!emailSnapshot.empty) {
            const doc = emailSnapshot.docs[0];
            return {
                key: doc.id,
                data: doc.data()
            };
        }

        // Se ainda não encontrou, procura na coleção de usuários
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.accessKey) {
                const keyDoc = await db.collection('accessKeys').doc(userData.accessKey).get();
                if (keyDoc.exists) {
                    return {
                        key: keyDoc.id,
                        data: keyDoc.data()
                    };
                }
            }
        }

        console.log('Nenhuma chave de acesso encontrada para o usuário:', userId);
        return null;
    } catch (error) {
        console.error('Erro ao buscar chave de acesso do usuário:', error);
        return null;
    }
}

// ATUALIZADO: Salva o UID do usuário no documento da chave de acesso
export async function signupUser({ name, email, password, keyDocId, guestNames, willAttendRestaurant, socialProvider = null, user = null }) {
    try {
        let currentUser = user;
        
        // Se não há usuário (cadastro por email/senha)
        if (!currentUser && password) {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            currentUser = userCredential.user;
            await currentUser.updateProfile({ displayName: name });
        }

        if (!currentUser) {
            throw new Error('Falha ao criar/obter usuário');
        }

        // Atualiza a chave de acesso com informações completas do usuário
        await db.collection('accessKeys').doc(keyDocId).update({
            isUsed: true,
            usedByEmail: currentUser.email,
            usedByUserId: currentUser.uid, // Campo correto
            usedAt: firebase.firestore.FieldValue.serverTimestamp(),
            willAttendRestaurant: willAttendRestaurant
        });

        // Salva os nomes dos convidados
        const batch = db.batch();
        guestNames.forEach((guestName, index) => {
            const guestRef = db.collection('accessKeys').doc(keyDocId).collection('guestNames').doc(`guest_${index}`);
            batch.set(guestRef, { name: guestName, order: index });
        });
        await batch.commit();

        // Cria/atualiza documento do usuário para referência rápida
        await db.collection('users').doc(currentUser.uid).set({
            name: name,
            email: currentUser.email,
            accessKey: keyDocId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            socialProvider: socialProvider
        }, { merge: true });

        return currentUser;
    } catch (error) {
        console.error('Erro no cadastro:', error);
        throw error;
    }
}
export async function updateRsvpDetails(keyId, { guestNames, willAttendRestaurant }) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('Usuário não autenticado');
        }

        // Atualiza os detalhes principais da chave
        await db.collection('accessKeys').doc(keyId).update({
            willAttendRestaurant: willAttendRestaurant,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Remove nomes antigos e adiciona os novos
        const guestNamesCollection = db.collection('accessKeys').doc(keyId).collection('guestNames');
        
        // Primeiro, remove todos os nomes existentes
        const existingNames = await guestNamesCollection.get();
        const batch = db.batch();
        
        existingNames.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Adiciona os novos nomes
        guestNames.forEach((guestName, index) => {
            const guestRef = guestNamesCollection.doc(`guest_${index}`);
            batch.set(guestRef, { name: guestName, order: index });
        });

        await batch.commit();
        
        console.log('RSVP atualizado com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar RSVP:', error);
        throw error;
    }
}

export async function userHasAccessToKey(keyId, userId) {
    try {
        const keyDoc = await db.collection('accessKeys').doc(keyId).get();
        if (!keyDoc.exists) return false;
        
        const keyData = keyDoc.data();
        const currentUser = auth.currentUser;
        
        return keyData.usedByUserId === userId || 
               keyData.usedByEmail === currentUser?.email;
    } catch (error) {
        console.error('Erro ao verificar permissão da chave:', error);
        return false;
    }
}

export async function getGuestNames(keyId) {
    try {
        const snapshot = await db.collection('accessKeys')
            .doc(keyId)
            .collection('guestNames')
            .orderBy('order')
            .get();
        
        return snapshot.docs.map(doc => doc.data().name);
    } catch (error) {
        console.error('Error fetching guest names:', error);
        return [];
    }
}

export async function uploadPhoto(file, user, onProgress) {
    const url = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);
    onProgress(25);
    try {
        const response = await fetch(url, { method: 'POST', body: formData });
        onProgress(75);
        if (!response.ok) throw new Error('Upload to Cloudinary failed');
        const data = await response.json();
        await db.collection('guestPhotos').add({
            imageUrl: data.secure_url,
            userName: user.displayName,
            userId: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        onProgress(100);
    } catch (error) {
        console.error("Upload error:", error);
        onProgress(0);
        throw error;
    }
}

export function listenToGuestPhotos(onPhotosUpdate) {
    return db.collection('guestPhotos').orderBy('createdAt', 'desc').onSnapshot(
        snapshot => onPhotosUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
        error => { console.error("Error listening to photos:", error); onPhotosUpdate([]); }
    );
}

export function postGuestbookMessage(user, message) {
    return db.collection('guestbook').add({
        userName: user.displayName,
        userId: user.uid,
        message: message,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

export function listenToGuestbookMessages(onMessagesUpdate) {
    return db.collection('guestbook').orderBy('createdAt', 'desc').onSnapshot(
        snapshot => onMessagesUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
        error => { console.error("Error listening to guestbook messages:", error); onMessagesUpdate([]); }
    );
}

export function listenToGiftList(onGiftsUpdate) {
    return db.collection('giftList').orderBy('name').onSnapshot(
        snapshot => onGiftsUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    );
}

export function markGiftAsTaken(giftId, user) {
    return db.collection('giftList').doc(giftId).update({
        isTaken: true,
        takenBy: user.displayName,
        takenById: user.uid
    });
}

export function unmarkGiftAsTaken(giftId) {
    return db.collection('giftList').doc(giftId).update({
        isTaken: false,
        takenBy: null,
        takenById: null
    });
}
