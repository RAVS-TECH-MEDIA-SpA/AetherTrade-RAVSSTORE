// apps/workers-ai/src/workers/fulfillment.worker.ts
import { PubSub, Message } from '@google-cloud/pubsub';
import { FulfillmentService } from '../fulfillment.service.js';

const pubsub = new PubSub({ projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-core' });
const fulfillmentService = new FulfillmentService();

const subscriptionName = 'aether-fulfillment-sub';

export const startFulfillmentWorker = async () => {
    console.log(`🚀 Iniciando Worker Logístico (AutoDS)...`);
    
    try {
        const topic = pubsub.topic('aether-fulfillment');
        const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });

        subscription.on('message', async (message: Message) => {
            console.log(`\n📥 [PubSub] Nueva orden para AutoDS recibida! ID: ${message.id}`);
            
            try {
                const payload = JSON.parse(message.data.toString());
                const { orderId } = payload;

                if (!orderId) {
                    throw new Error('El payload no contiene un orderId válido.');
                }

                // Llamamos a tu servicio maestro de AutoDS
                await fulfillmentService.processOrderToAutoDS(orderId);
                
                message.ack(); 
                
            } catch (error) {
                console.error(`🚨 Error procesando envío a AutoDS en el Worker:`, error);
                message.ack(); 
            }
        });

        subscription.on('error', (error) => {
            console.error('🚨 Error crítico en la conexión de PubSub (AutoDS):', error);
        });

    } catch (error) {
        console.error(`❌ No se pudo iniciar el Worker Logístico:`, error);
    }
};