// api/processQueue.js
import admin from 'firebase-admin';

// Inicializa o Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('Firebase Admin inicializado com sucesso');
  } catch (e) {
    console.error('Falha ao inicializar Firebase Admin:', e);
    throw e;
  }
}

const db = admin.firestore();
const messaging = admin.messaging();

// Esta é a função que a Vercel vai executar
export default async function handler(request, response) {
  // Permite apenas requisições GET (chamadas pelo cron)
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🔔 Iniciando processamento da fila de notificações...');
    
    // Busca até 30 notificações não processadas
    const queueSnapshot = await db.collection('notificationQueue')
      .where('processed', '==', false)
      .limit(30)
      .get();

    if (queueSnapshot.empty) {
      console.log('✅ Fila vazia. Nada a fazer.');
      return response.status(200).json({ 
        message: 'Fila vazia',
        processed: 0 
      });
    }

    console.log(`📨 Encontradas ${queueSnapshot.size} notificações na fila`);

    // Processa todas as notificações em paralelo
    const promises = [];
    queueSnapshot.forEach(doc => {
      const data = doc.data();
      const job = processMessage(data, doc.ref);
      promises.push(job);
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`✅ Processamento concluído: ${successCount} sucesso, ${failCount} falhas`);

    return response.status(200).json({
      message: `Processados ${queueSnapshot.size} trabalhos`,
      success: successCount,
      failed: failCount,
      total: queueSnapshot.size
    });

  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    return response.status(500).json({ 
      error: 'Erro interno ao processar a fila',
      details: error.message 
    });
  }
}

// Processa uma única mensagem
async function processMessage(data, docRef) {
  try {
    const message = {
      notification: {
        title: data.payload.notification.title,
        body: data.payload.notification.body,
        image: data.payload.notification.icon
      },
      data: data.payload.data || {},
      token: data.token,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'wedding_notifications',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          requireInteraction: data.payload.data?.urgent === 'true',
          icon: data.payload.notification.icon,
          badge: '/images/icons/icon-192x192.png',
          vibrate: data.payload.data?.urgent === 'true' 
            ? [300, 100, 300, 100, 300] 
            : [200, 100, 200]
        },
      },
    };

    const response = await messaging.send(message);
    console.log(`✅ Notificação enviada: ${response}`);

    // Marca como processada
    await docRef.update({
      processed: true,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      response: response,
      success: true,
    });

    return { success: true, messageId: response };

  } catch (error) {
    console.error(`❌ Erro ao enviar para ${data.token}:`, error.message);

    // Marca como falha
    await docRef.update({
      processed: true,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: error.message,
      success: false,
    });

    // Remove tokens inválidos
    if (
      error.code === 'messaging/invalid-registration-token' ||
      error.code === 'messaging/registration-token-not-registered'
    ) {
      console.log('🗑️ Token inválido, removendo do usuário...');
      
      const usersSnapshot = await db.collection('users')
        .where('fcmToken', '==', data.token)
        .get();

      const batch = db.batch();
      usersSnapshot.forEach((doc) => {
        batch.update(doc.ref, { fcmToken: null });
      });
      await batch.commit();
      
      console.log('✅ Token removido do Firestore');
    }

    return { success: false, error: error.message };
  }
}