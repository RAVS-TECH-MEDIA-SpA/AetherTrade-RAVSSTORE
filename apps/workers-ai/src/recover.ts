import { PubSub } from '@google-cloud/pubsub';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from './lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

const pubsub = new PubSub();

async function runRecovery() {
  console.log("Iniciando la operacion de rescate de productos...");

  try {
    const query = `
      SELECT id, aliexpress_id, target_country 
      FROM products 
      WHERE status = 'PENDING' 
         OR (status = 'REJECTED' AND updated_at >= NOW() - INTERVAL '24 hours');
    `;
    
    const res = await pool.query(query);
    console.log(`Se encontraron ${res.rowCount} productos estancados o fallidos recientemente.`);

    if (res.rowCount === 0) {
      console.log("No hay nada que recuperar. Saliendo...");
      process.exit(0);
    }

    let count = 0;
    for (const row of res.rows) {
      const { id, aliexpress_id, target_country } = row;
      
      // Volvemos a cambiar el estado a PENDING si es que estaba en REJECTED
      await pool.query(`UPDATE products SET status = 'PENDING' WHERE id = $1`, [id]);

      // Lo reinyectamos a la cola central
      await pubsub.topic('candidate-analysis').publishMessage({ 
        data: Buffer.from(JSON.stringify({ 
          dbId: id, 
          itemId: aliexpress_id, 
          targetCountry: target_country 
        })) 
      });
      
      console.log(`✅ Reinyectado a PubSub: ID ${aliexpress_id}`);
      count++;
      
      // Una mini pausa de 50ms para no saturar tu propia red de golpe
      await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    console.log(`\nRescate completado: ${count} productos enviados al AnalysisWorker.`);
    process.exit(0);

  } catch (error: any) {
    console.error("Error crítico durante el rescate:", error.message);
    process.exit(1);
  }
}

runRecovery();