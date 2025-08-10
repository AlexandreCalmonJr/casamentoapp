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
export async function findAccessKeyForUser(uid) {
    try {
        const snapshot = await db.collection('accessKeys').where('usedByUID', '==', uid).limit(1).get();
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { key: doc.id, data: doc.data() };
    } catch (error) {
        console.error("Error finding access key for user:", error);
        return null;
    }
}

export function loginUser(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

// ATUALIZADO: Salva o UID do usuário no documento da chave de acesso
export async function signupUser({ name, email, password, keyDocId, guestNames, willAttendRestaurant, socialProvider = null, user = null }) {
    let userCredential;
    if (socialProvider && user) {
        userCredential = { user };
        if (!user.displayName || user.displayName !== name) await user.updateProfile({ displayName: name });
    } else {
        userCredential = await auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: name });
    }
    const keyRef = db.collection('accessKeys').doc(keyDocId);
    const guestNamesCollectionRef = keyRef.collection('guestNames');
    const batch = db.batch();
    guestNames.forEach(guestName => {
        if (guestName.trim() !== '') batch.set(guestNamesCollectionRef.doc(), { name: guestName });
    });
    await batch.commit();
    await keyRef.update({
        isUsed: true,
        usedByEmail: userCredential.user.email,
        usedByUID: userCredential.user.uid, // NOVO CAMPO
        usedAt: firebase.firestore.FieldValue.serverTimestamp(),
        willAttendRestaurant: willAttendRestaurant,
        authMethod: socialProvider || 'email'
    });
}

export async function updateRsvpDetails(keyId, newData) {
    const keyRef = db.collection('accessKeys').doc(keyId);
    const guestNamesRef = keyRef.collection('guestNames');
    const oldNamesSnapshot = await guestNamesRef.get();
    const deleteBatch = db.batch();
    oldNamesSnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();
    const addBatch = db.batch();
    newData.guestNames.forEach(name => {
        if (name.trim()) addBatch.set(guestNamesRef.doc(), { name });
    });
    await addBatch.commit();
    return keyRef.update({ willAttendRestaurant: newData.willAttendRestaurant });
}

export async function getGuestNames(keyId) {
    try {
        const snapshot = await db.collection('accessKeys').doc(keyId).collection('guestNames').get();
        return snapshot.empty ? [] : snapshot.docs.map(doc => doc.data().name);
    } catch (error) {
        console.error("Error fetching guest names:", error);
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
