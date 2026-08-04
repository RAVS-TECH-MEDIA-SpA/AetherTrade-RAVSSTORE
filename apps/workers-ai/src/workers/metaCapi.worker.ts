import { PubSub } from '@google-cloud/pubsub';
// Asegúrate de que la ruta de importación coincida con donde guardaste el MetaCapiService
import { MetaCapiService } from '../services/metaCapiService.js'; 

const pubsub = new PubSub({ projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-core' });
const capiService = new MetaCapiService();

export async function listenForMetaCapiEvents() {
  const topicName = 'aether-meta-capi';
  const subscriptionName = 'aether-meta-capi-sub';

  // 1. Verificación e inicialización de Tópico y Suscripción
  const topic = pubsub.topic(topicName);
  const [topicExists] = await topic.exists();
  if (!topicExists) {
    console.log(`⚠️ Tópico no encontrado. Creando [${topicName}]...`);
    await topic.create();
  }

  const subscriptionTest = topic.subscription(subscriptionName);
  const [subExists] = await subscriptionTest.exists();
  if (!subExists) {
    console.log(`⚠️ Suscripción no encontrada. Creando [${subscriptionName}]...`);
    await subscriptionTest.create();
  }

  // 2. Conexión a la suscripción
  const subscription = pubsub.subscription(subscriptionName);

  console.log("📡 [LISTENER] Meta CAPI Worker listo y escuchando compras aprobadas...");

  subscription.on('message', async (message) => {
    let payload;
    
    try {
      payload = JSON.parse(message.data.toString());
      console.log(`\n🛍️ [META CAPI] Procesando evento Purchase para Orden: ${payload.order_id}`);

      // 3. Ejecutar el servicio que habla con Facebook
      await capiService.sendCapiEvent(payload);

      // 4. Si Facebook responde OK, borramos el mensaje de Pub/Sub
      console.log(`✅ [META CAPI] Orden ${payload.order_id} notificada a Meta con éxito.`);
      message.ack();

    } catch (error) {
      console.error(`❌ [META CAPI] Error al procesar mensaje de la orden:`, error);
      
      // Si Facebook está caído o da error 500, usamos nack() 
      // Esto le dice a Pub/Sub: "Fallé, vuelve a enviarme este mensaje en un rato"
      message.nack(); 
    }
  });
}

// Descomentar la siguiente línea si este archivo se ejecuta de forma independiente,
// o impórtalo y ejecútalo en tu index/main principal de workers.
// listenForMetaCapiEvents();