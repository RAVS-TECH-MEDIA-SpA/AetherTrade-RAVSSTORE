// apps/workers-ai/src/workers/billing.worker.ts
import { PubSub, Message } from '@google-cloud/pubsub';
import { BillingService } from '../billing.service.js';

const pubsub = new PubSub({ projectId: process.env.PUBSUB_PROJECT_ID || 'aethertrade-core' });
const billingService = new BillingService();

// El nombre de la suscripción que escuchará el topic 'aether-billing'
const subscriptionName = 'aether-billing-sub';

export const startBillingWorker = async () => {
    console.log(`🚀 Iniciando Worker de Facturación (SimpleFactura)...`);
    
    try {
        const topic = pubsub.topic('aether-billing');
        // Validamos si la suscripción existe, si no, la crea automáticamente
        const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });

        subscription.on('message', async (message: Message) => {
            console.log(`\n📥 [PubSub] Mensaje de pago recibido! ID: ${message.id}`);
            
            try {
                const payload = JSON.parse(message.data.toString());
                const { orderId } = payload;

                if (!orderId) {
                    throw new Error('El payload no contiene un orderId válido.');
                }

                // Llamamos a nuestro servicio maestro de boletas
                await billingService.processBilling(orderId);
                
                // ¡VITAL! Confirmamos a PubSub que terminamos el trabajo para que borre el mensaje
                message.ack(); 
                
            } catch (error) {
                console.error(`🚨 Error procesando la boleta en el Worker:`, error);
                message.ack(); 
            }
        });

        subscription.on('error', (error) => {
            console.error('🚨 Error crítico en la conexión de la suscripción de PubSub (Facturación):', error);
        });

    } catch (error) {
        console.error(`❌ No se pudo iniciar el Worker de Facturación:`, error);
    }
};