// js/firebase-service.js

import { cloudinaryConfig, firebaseConfig } from './config.js';

firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();

// --- Funções de Autenticação ---
export function loginUser(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

// --- Funções de Login Social ---
export function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
}

export async function uploadFileToCloudinary(file, onProgress) {
    const url = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress);
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                resolve(data.secure_url);
            } else {
                reject(new Error('Upload para Cloudinary falhou: ' + xhr.statusText));
            }
        };

        xhr.onerror = () => {
            reject(new Error('Erro de rede durante o upload.'));
        };

        xhr.send(formData);
    });
}

// --- Funções do Casamento ---

export async function getWeddingDetails() {
    try {
        const docRef = db.collection('siteConfig').doc('details');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            return {
                ...data,
                weddingDate: data.weddingDate.toDate(),
                rsvpDate: data.rsvpDate.toDate()
            };
        }
        return null;
    } catch (error) {
        console.error("Error fetching wedding details:", error);
        return null;
    }
}

export async function getTimelineEvents() {
    try {
        const snapshot = await db.collection('timeline').orderBy('date', 'asc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching timeline events:", error);
        return [];
    }
}

export async function validateAccessKey(key) {
    const docRef = db.collection('accessKeys').doc(key);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return { isValid: false, isUsed: false, docId: null, data: null };
    const docData = docSnap.data();
    return { isValid: true, isUsed: docData.isUsed, docId: docSnap.id, data: docData };
}

export async function findAccessKeyForUser(userId) {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) return null;

        const snapshot = await db.collection('accessKeys')
            .where('usedByUserId', '==', userId)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { key: doc.id, data: doc.data() };
        }

        const emailSnapshot = await db.collection('accessKeys')
            .where('usedByEmail', '==', currentUser.email)
            .limit(1)
            .get();

        if (!emailSnapshot.empty) {
            const doc = emailSnapshot.docs[0];
            await doc.ref.update({ usedByUserId: userId });
            return { key: doc.id, data: doc.data() };
        }

        return null;
    } catch (error) {
        console.error('Erro ao buscar chave de acesso do usuário:', error);
        return null;
    }
}

export async function signupUser({ name, email, password, keyDocId, guestNames, willAttendRestaurant, socialProvider = null, user = null }) {
    try {
        let currentUser = user;

        if (!currentUser && password) {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            currentUser = userCredential.user;
            await currentUser.updateProfile({ displayName: name });
        }

        if (!currentUser) {
            throw new Error('Falha ao criar/obter usuário');
        }

        await db.collection('accessKeys').doc(keyDocId).update({
            isUsed: true,
            usedByEmail: currentUser.email,
            usedByUserId: currentUser.uid,
            usedAt: firebase.firestore.FieldValue.serverTimestamp(),
            willAttendRestaurant: willAttendRestaurant
        });

        const batch = db.batch();
        guestNames.forEach((guestName, index) => {
            const guestRef = db.collection('accessKeys').doc(keyDocId).collection('guestNames').doc(`guest_${index}`);
            batch.set(guestRef, { name: guestName, order: index });
        });
        await batch.commit();

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
        if (!currentUser) throw new Error('Usuário não autenticado');

        await db.collection('accessKeys').doc(keyId).update({
            willAttendRestaurant: willAttendRestaurant,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const guestNamesCollection = db.collection('accessKeys').doc(keyId).collection('guestNames');
        const existingNames = await guestNamesCollection.get();
        const batch = db.batch();

        existingNames.forEach(doc => batch.delete(doc.ref));
        guestNames.forEach((guestName, index) => {
            const guestRef = guestNamesCollection.doc(`guest_${index}`);
            batch.set(guestRef, { name: guestName, order: index });
        });

        await batch.commit();
    } catch (error) {
        console.error('Erro ao atualizar RSVP:', error);
        throw error;
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
        if (!response.ok) throw new Error('Upload para Cloudinary falhou');
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

export function addContributorToGift(giftId, user) {
    const contributor = {
        userId: user.uid,
        userName: user.displayName
    };
    return db.collection('giftList').doc(giftId).update({
        contributors: firebase.firestore.FieldValue.arrayUnion(contributor)
    });
}

export function removeContributorFromGift(giftId, user) {
    const contributor = {
        userId: user.uid,
        userName: user.displayName
    };
    return db.collection('giftList').doc(giftId).update({
        contributors: firebase.firestore.FieldValue.arrayRemove(contributor)
    });
}

// --- NOVO: Funções para Timeline do Casal ---
export function listenToTimeline(onTimelineUpdate) {
    return db.collection('timeline').orderBy('date', 'asc').onSnapshot(
        snapshot => onTimelineUpdate(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
        error => { console.error("Error listening to timeline:", error); onTimelineUpdate([]); }
    );
}