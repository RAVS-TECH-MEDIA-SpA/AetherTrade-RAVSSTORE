import { PubSub } from '@google-cloud/pubsub';
import { Pool } from 'pg';
import { Redis } from 'ioredis'; // npm install ioredis
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { TrendService } from '../services/trend.service.js';
import { AliExpressService } from '../aliexpress.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const redis = new Redis(process.env.REDIS_URL || ''); // Configura REDIS_URL en tu .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD || ''),
  port: parseInt(process.env.DB_PORT || '5432'),
});

const pubsub = new PubSub();
const trendService = new TrendService();
const aliService = new AliExpressService();

const TARGET_MARKETS = [
  { code: 'CL', name: 'Chile' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'CA', name: 'Canadá' },
  { code: 'BR', name: 'Brasil' }
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Filtros de Negocio (Para no gastar créditos de detalle en basura)
const FILTERS = { MIN_PRICE: 5.0, MAX_PRICE: 80.0, MIN_RATING: 4.5, MIN_SALES: 100 };

export async function runDiscoveryTask() {
  console.log('🚀 Iniciando Ciclo de Descubrimiento Global Optimizado...');

  for (const market of TARGET_MARKETS) {
    console.log(`\n🌍 Mercado: ${market.name} [${market.code}]`);

    try {
      const dynamicNiches = await trendService.getDynamicNiches(market.code);

      for (const niche of dynamicNiches) {
        const items = await aliService.searchTrending(niche, market.code);

        for (const item of items) {
          const { aliexpress_id, title, price, rating, sales } = item;

          // 1. FILTRO REDIS: ¿Ya lo procesamos esta semana?
          const cacheKey = `processed:${aliexpress_id}`;
          const isCached = await redis.get(cacheKey);
          if (isCached) continue;

          // 2. FILTRO DE NEGOCIO (Discovery "Gratis")
          if (price < FILTERS.MIN_PRICE || price > FILTERS.MAX_PRICE || rating < FILTERS.MIN_RATING || sales < FILTERS.MIN_SALES) {
            continue;
          }

          try {
            const query = `
              INSERT INTO products (aliexpress_id, title_original, base_cost_usd, rating, sales_count, status, target_country, created_at)
              VALUES ($1, $2, $3, $4, $5, 'CANDIDATE', $6, NOW())
              ON CONFLICT (aliexpress_id) DO NOTHING RETURNING id;
            `;
            
            const res = await pool.query(query, [aliexpress_id, title, price, rating, sales, market.code]);

            if (res.rows.length > 0) {
              const dbId = res.rows[0].id;
              await pubsub.topic('candidate-analysis').publishMessage({ 
                data: Buffer.from(JSON.stringify({ dbId, itemId: aliexpress_id, targetCountry: market.code })) 
              });
              
              // Guardar en Redis por 7 días (evita duplicar gastos de RapidAPI/IA)
              await redis.set(cacheKey, '1', 'EX', 604800);
              console.log(`✅ [${market.code}] Candidato detectado: ${aliexpress_id}`);
            }
          } catch (err: any) {
            console.error(`❌ Error DB:`, err.message);
          }
        }
        await sleep(2000); 
      }
    } catch (error: any) {
      console.error(`⚠️ Error en mercado ${market.name}:`, error.message);
    }
  }
}