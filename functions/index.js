// functions/index.js
// Este arquivo deve ser criado no projeto Firebase Functions

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Cloud Function que processa a fila de notificações
exports.processNotificationQueue = functions.firestore
    .document("notificationQueue/{queueId}")
    .onCreate(async (snap, context) => {
      const data = snap.data();

      if (data.processed) {
        return null;
      }

      try {
        // Envia a notificação via FCM
        const message = {
          notification: data.payload.notification,
          data: data.payload.data || {},
          token: data.token,
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channelId: "wedding_notifications",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              requireInteraction: data.payload.data.urgent === "true",
              icon: data.payload.notification.icon,
              title: data.payload.notification.title,
              body: data.payload.notification.body,
              vibrate: data.payload.data.urgent === "true" ?
                [300, 100, 300, 100, 300] : [200, 100, 200],
            },
          },
        };

        const response = await admin.messaging().send(message);
        console.log("Notificação enviada com sucesso:", response);

        // Marca como processada
        await snap.ref.update({
          processed: true,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          response: response,
          success: true,
        });

        return response;
      } catch (error) {
        console.error("Erro ao enviar notificação:", error);

        // Marca como falha
        await snap.ref.update({
          processed: true,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          error: error.message,
          success: false,
        });

        // Remove token inválido do usuário
        if (error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered") {
          console.log("Token inválido, removendo do usuário");

          // Busca e remove o token do usuário
          const usersSnapshot = await admin.firestore()
              .collection("users")
              .where("fcmToken", "==", data.token)
              .get();

          const batch = admin.firestore().batch();
          usersSnapshot.forEach((doc) => {
            batch.update(doc.ref, {fcmToken: null});
          });
          await batch.commit();
        }

        return null;
      }
    });

// Cloud Function para enviar notificações agendadas (24h e 3h antes)
exports.sendScheduledNotifications = functions.pubsub
    .schedule("every 1 hours")
    .timeZone("America/Sao_Paulo")
    .onRun(async (context) => {
      try {
        // Busca detalhes do casamento
        const detailsDoc = await admin.firestore()
            .collection("siteConfig")
            .doc("details")
            .get();

        if (!detailsDoc.exists) {
          console.log("Detalhes do casamento não encontrados");
          return null;
        }

        const weddingDetails = detailsDoc.data();
        const weddingDate = weddingDetails.weddingDate.toDate();
        const now = new Date();
        const hoursDiff = (weddingDate - now) / (1000 * 60 * 60);

        console.log(`Diferença até o casamento: ${hoursDiff.toFixed(2)} horas`);

        // Notificação 24h antes
        if (hoursDiff > 23.5 && hoursDiff < 24.5) {
          await sendReminders24h(weddingDetails);
        }

        // Notificação 3h antes
        if (hoursDiff > 2.5 && hoursDiff < 3.5) {
          await sendReminders3h(weddingDetails);
        }

        return null;
      } catch (error) {
        console.error("Erro ao enviar notificações agendadas:", error);
        return null;
      }
    });

/**
 * Envia lembretes 24 horas antes do casamento
 * @param {Object} weddingDetails - Detalhes do casamento
 * @return {Promise<void>}
 */
async function sendReminders24h(weddingDetails) {
  console.log("Enviando lembretes de 24h");

  // Busca todos os usuários cadastrados
  const usersSnapshot = await admin.firestore()
      .collection("users")
      .where("fcmToken", "!=", null)
      .get();

  const batch = admin.firestore().batch();

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const token = userData.fcmToken;

    // Busca informações da chave de acesso
    const keyDoc = await admin.firestore()
        .collection("accessKeys")
        .doc(userData.accessKey)
        .get();

    if (!keyDoc.exists) continue;

    const keyData = keyDoc.data();
    const willAttendRestaurant = keyData.willAttendRestaurant;

    const title = willAttendRestaurant ?
      "🍽️ Lembrete: Restaurante Amanhã!" :
      "⛪ Lembrete: Cerimônia Amanhã!";

    const body = willAttendRestaurant ?
      `Olá ${keyData.guestName}! Lembre-se que amanhã após a cerimônia ` +
      `teremos a recepção. Estamos ansiosos!` :
      `Olá ${keyData.guestName}! A cerimônia será amanhã. ` +
      `Mal podemos esperar para vê-lo(a)!`;

    // Adiciona à fila
    const queueRef = admin.firestore().collection("notificationQueue").doc();
    batch.set(queueRef, {
      token,
      payload: {
        notification: {
          title,
          body,
          icon: "/images/icons/icon-192x192.png",
        },
        data: {tag: "reminder-24h", urgent: "true", url: "#rsvp"},
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });
  }

  await batch.commit();
  console.log("Lembretes de 24h adicionados à fila");
}

/**
 * Envia lembretes 3 horas antes do casamento
 * @param {Object} weddingDetails - Detalhes do casamento
 * @return {Promise<void>}
 */
async function sendReminders3h(weddingDetails) {
  console.log("Enviando lembretes de 3h");

  const usersSnapshot = await admin.firestore()
      .collection("users")
      .where("fcmToken", "!=", null)
      .get();

  const batch = admin.firestore().batch();

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const token = userData.fcmToken;

    const queueRef = admin.firestore().collection("notificationQueue").doc();
    batch.set(queueRef, {
      token,
      payload: {
        notification: {
          title: "💒 O Grande Dia Chegou!",
          body: "A cerimônia começa em poucas horas! Até logo! 💕",
          icon: "/images/icons/icon-192x192.png",
        },
        data: {tag: "reminder-3h", urgent: "true", url: "#rsvp"},
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: false,
    });
  }

  await batch.commit();
  console.log("Lembretes de 3h adicionados à fila");
}

// Função para limpar a fila de notificações antigas (executar semanalmente)
exports.cleanOldNotifications = functions.pubsub
    .schedule("every sunday 03:00")
    .timeZone("America/Sao_Paulo")
    .onRun(async (context) => {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const oldNotifications = await admin.firestore()
            .collection("notificationQueue")
            .where("createdAt", "<", oneWeekAgo)
            .where("processed", "==", true)
            .get();

        const batch = admin.firestore().batch();
        oldNotifications.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`${oldNotifications.size} notificações antigas removidas`);

        return null;
      } catch (error) {
        console.error("Erro ao limpar notificações antigas:", error);
        return null;
      }
    });
