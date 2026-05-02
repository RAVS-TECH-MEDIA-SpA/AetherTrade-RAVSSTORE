import { PubSub } from '@google-cloud/pubsub';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../lib/db.js';
import { redis } from '../lib/redis.js'; 
import { AliExpressService } from '../aliexpress.service.js';
import { GeminiService } from '../gemini.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

const pubsub = new PubSub();
const aliService = new AliExpressService();
const gemini = new GeminiService();

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const FILTERS = { 
  MIN_PRICE: 1.5, 
  MAX_PRICE: 85.0, 
  MIN_RATING: 4.2, 
  MIN_SALES: 50,
  MAX_SHIPPING: 4.0 
};

export async function runDiscoveryTask() {
  const ahora = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
  console.log(`\n Iniciando DiscoveryWorker V1.1: ${ahora}`);

  try {
    const marketsRes = await pool.query(`SELECT country_code, country_name FROM tax_rules WHERE is_active = TRUE`);

    for (const market of marketsRes.rows) {
      const { country_code } = market;
      
      const dynamicNiches = await gemini.generateDynamicNiches(country_code); 

      for (const niche of dynamicNiches) {
        console.log(`Analizando nicho IA: "${niche}" en ${country_code}...`);
        
        await pool.query('INSERT INTO niche_cache (country_code, niche_text) VALUES ($1, $2) ON CONFLICT DO NOTHING', [country_code, niche]);

        const items = await aliService.searchTrending(niche, country_code);
        
        // LÓGICA DE AHORRO DE CRÉDITOS: Contador de candidatos
        let candidatesFound = 0;
        
        for (const item of items) {
          
          // Si ya validamos 10 productos, rompemos el ciclo y pasamos al siguiente nicho
          if (candidatesFound >= 10) {
            console.log(`Ahorro de créditos: 10 candidatos encontrados para "${niche}". Pasando al siguiente nicho.`);
            break; 
          }

          const { aliexpress_id, title, price, rating, sales, imageUrl } = item;
          
          const cacheKey = `proc:${country_code}:${aliexpress_id}`;
          if (await redis.get(cacheKey)) continue;

          if (price < FILTERS.MIN_PRICE || price > FILTERS.MAX_PRICE) continue;
          if (rating < FILTERS.MIN_RATING) continue;
          if (sales < FILTERS.MIN_SALES) continue;

          try {
            const detail = await aliService.getItemDetail(aliexpress_id);



            const finalPrice = Number(detail?.price) || Number(price) || 0;
            const finalShipping = Number(detail?.shippingFee) || 0;
            const finalTitle = detail?.title || title || "Producto sin nombre";

            if (finalShipping > FILTERS.MAX_SHIPPING) {
              console.log(`Descartado ${aliexpress_id}: Envío ($${finalShipping}) supera margen.`);
              continue; 
            }
            
            let videoUrl = detail?.videoUrl || null;
            if (!videoUrl && finalTitle !== "Producto sin nombre") {
              videoUrl = await aliService.findProductVideo(finalTitle);
            }

            if (detail && detail.stock < 10) continue;

            console.log(`Candidato Aceptado. Insertando ${aliexpress_id} a BD...`);
            
            // Sumamos 1 al contador de candidatos exitosos
            candidatesFound++;

            const insertQuery = `
                  INSERT INTO products (
                    aliexpress_id, title_original, image_url, video_url, target_country, 
                    base_cost_usd, shipping_cost_usd, rating, sales_count, status,
                    raw_details -- Nueva columna
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', $10)
                  ON CONFLICT (aliexpress_id, target_country) 
                  DO UPDATE SET 
                    updated_at = NOW(), 
                    sales_count = EXCLUDED.sales_count,
                    raw_details = EXCLUDED.raw_details -- Actualizamos el detalle por si cambió el stock/precio
                  RETURNING id;
                `;

                const res = await pool.query(insertQuery, [
                  aliexpress_id, 
                  finalTitle, 
                  imageUrl, 
                  videoUrl, 
                  country_code,
                  finalPrice, 
                  finalShipping, 
                  rating, 
                  sales,
                  JSON.stringify(detail) // Pasamos el objeto completo como string para JSONB
                ]);
            if (res.rows.length > 0) {
              await pubsub.topic('candidate-analysis-2').publishMessage({ 
                data: Buffer.from(JSON.stringify({ 
                  dbId: res.rows[0].id, 
                  itemId: aliexpress_id, 
                  targetCountry: country_code 
                })) 
              });
              await redis.set(cacheKey, '1', 'EX', 604800);
            }
          } catch (err: any) {
            console.error(`Error Discovery ID ${aliexpress_id}:`, err.message);
          }
          await sleep(600);
        }
      }
    }
  } catch (globalError: any) {
    console.error("Error Critico Discovery:", globalError.message);
  }
}