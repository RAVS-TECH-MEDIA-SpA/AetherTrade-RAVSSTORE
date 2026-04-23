import { PubSub } from '@google-cloud/pubsub';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { TrendService } from '../services/trend.service.js';
import { AliExpressService } from '../aliexpress.service.js';
import { FilterService } from '../services/filter.service.js';

// 1. Configuración de Mercados Globales (Tier 1)
const TARGET_MARKETS = [
  { code: 'CL', name: 'Chile' },
  { code: 'ES', name: 'España' },
  { code: 'DE', name: 'Alemania' },
  { code: 'UK', name: 'Reino Unido' },
  { code: 'IT', name: 'Italia' },
  { code: 'FR', name: 'Francia' },
  { code: 'US', name: 'Estados Unidos' }
];


// 1. Reconstrucción de la ruta (4 niveles arriba desde src/workers/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../../.env');

// 2. Carga forzada antes de inicializar la Pool
dotenv.config({ path: rootEnvPath });

// [DEBUG] Para tu tranquilidad, veamos si ahora sí los ve
console.log('--- [DB Debug] ---');
console.log('DB_HOST:', process.env.DB_HOST || '❌ No detectado');
console.log('DB_USER:', process.env.DB_USER || '❌ No detectado');
console.log('------------------');

// 3. Ahora la Pool ya tendrá los datos
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

const pubsub = new PubSub();
const trendService = new TrendService();
const aliService = new AliExpressService();

// Helper para evitar el baneo de APIs (Rate Limiting)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runDiscoveryTask() {
  console.log('🚀 Iniciando Ciclo de Descubrimiento Global...');

  for (const market of TARGET_MARKETS) {
    const { code, name } = market;
    console.log(`\n🌍 Mercado Actual: ${name} [${code}]`);

    try {
      // 2. Gemini genera nichos inteligentes para este país específico
      const dynamicNiches = await trendService.getDynamicNiches(code);
      console.log(`💡 IA sugirió ${dynamicNiches.length} nichos para ${name}`);

      for (const niche of dynamicNiches) {
        console.log(`🔎 Buscando "${niche}" en AliExpress (${code})...`);
        
        // Obtenemos productos reales con stock y precio
        const items = await aliService.searchTrending(niche, code);
        console.log(`📦 AliExpress devolvió ${items.length} productos para el nicho "${niche}"`); 

        for (const item of items) {
          // 3. Aplicar filtros de calidad (evitar productos sin reviews o mala descripción)
          if (FilterService.isProductTrash(item)) continue;

          try {
            // 4. Persistencia en DB como Candidato
            const query = `
              INSERT INTO products (
                aliexpress_id, 
                title_original, 
                base_cost_usd, 
                rating, 
                sales_count, 
                status, 
                target_country,
                created_at
              )
              VALUES ($1, $2, $3, $4, $5, 'CANDIDATE', $6, NOW())
              ON CONFLICT (aliexpress_id) DO NOTHING
              RETURNING id;
            `;
            
            const res = await pool.query(query, [
              item.item_id,
              item.title,
              parseFloat(item.price?.value || "0"),
              parseFloat(item.evaluate_rate || "0"),
              parseInt(item.sales_count || "0"),
              code
            ]);

            // 5. Notificar al AnalysisWorker vía Pub/Sub solo si el producto es nuevo
            if (res.rows.length > 0) {
              const message = JSON.stringify({
                dbId: res.rows[0].id,
                itemId: item.item_id,
                targetCountry: code
              });

              await pubsub.topic('candidate-analysis').publishMessage({ 
                data: Buffer.from(message) 
              });
              
              console.log(`✅ Candidato guardado: [${item.item_id}] para ${code}`);
            }
          } catch (err) {
            console.error(`❌ Error persistiendo producto ${item.item_id}:`, err);
          }
        }

        // Delay preventivo entre nichos para no saturar RapidAPI
        await sleep(2000); 
      }
      
      // Delay preventivo entre países para refrescar cuotas
      console.log(`🏁 Finalizado descubrimiento en ${name}. Esperando siguiente mercado...`);
      await sleep(5000);

    } catch (error: any) {
      console.error(`⚠️ Error procesando mercado ${name}:`, error.message);
      continue; // Si falla un país, seguimos con el siguiente
    }
  }

  console.log('\n✅ Ciclo Global de Descubrimiento Finalizado.');
}