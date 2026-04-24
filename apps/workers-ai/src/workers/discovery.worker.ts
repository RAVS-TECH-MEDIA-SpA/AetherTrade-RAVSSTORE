import { PubSub } from '@google-cloud/pubsub';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { TrendService } from '../services/trend.service.js';
import { AliExpressService } from '../aliexpress.service.js';

// 1. Configuración de Entorno y Rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnvPath });

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

const TARGET_MARKETS = [
  { code: 'CL', name: 'Chile' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' }
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Filtros de Negocio (Ajustables)
 */
const FILTERS = {
  MIN_PRICE: 5.0,
  MAX_PRICE: 50.0,
  MIN_RATING: 4.0,
  MIN_SALES: 10
};

export async function runDiscoveryTask() {
  console.log('🚀 Iniciando Ciclo de Descubrimiento Global...');

  for (const market of TARGET_MARKETS) {
    const { code, name } = market;
    console.log(`\n🌍 Mercado Actual: ${name} [${code}]`);

    try {
      // 2. IA genera nichos (Capa de Inteligencia con Caché)
      const dynamicNiches = await trendService.getDynamicNiches(code);
      console.log(`💡 IA sugirió ${dynamicNiches.length} nichos para ${name}`);

      for (const niche of dynamicNiches) {
        console.log(`🔎 Buscando "${niche}" en AliExpress...`);
        
        // 3. AliExpress API (Capa de Discovery Global)
        const items = await aliService.searchTrending(niche, code);

        for (const item of items) {
          // Desestructuración basada en el nuevo mapeo del AliExpressService
          const { aliexpress_id, title, price, rating, sales } = item;

          // Filtro preventivo de calidad/negocio
          if (price < FILTERS.MIN_PRICE || price > FILTERS.MAX_PRICE || rating < FILTERS.MIN_RATING) {
            continue;
          }

          try {
            // 4. Persistencia con ajuste de ON CONFLICT
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
              aliexpress_id,
              title,
              price,
              rating,
              sales,
              code
            ]);

            // 5. Reintegración de Pub/Sub: Solo si el INSERT fue exitoso (res.rows.length > 0)
            if (res.rows.length > 0) {
              const dbId = res.rows[0].id;
              
              const message = JSON.stringify({
                dbId: dbId,
                itemId: aliexpress_id,
                targetCountry: code
              });

              await pubsub.topic('candidate-analysis').publishMessage({ 
                data: Buffer.from(message) 
              });
              
              console.log(`✅ Candidato guardado y enviado a análisis: [${aliexpress_id}] para ${code}`);
            }
          } catch (err: any) {
            console.error(`❌ Error persistiendo producto ${aliexpress_id}:`, err.message);
          }
        }
        await sleep(2000); // Rate limit preventivo
      }
      
      console.log(`🏁 Finalizado descubrimiento en ${name}.`);
      await sleep(5000);

    } catch (error: any) {
      console.error(`⚠️ Error procesando mercado ${name}:`, error.message);
      continue;
    }
  }

  console.log('\n✅ Ciclo Global de Descubrimiento Finalizado.');
}