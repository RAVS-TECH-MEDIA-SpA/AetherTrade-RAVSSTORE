import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Importamos tus servicios ya configurados
import { SerperService } from '../services/serper.service.js';
import { MediaService } from '../services/media.services.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD || ''),
  port: parseInt(process.env.DB_PORT || '5432'),
});

const serper = new SerperService();
const media = new MediaService();

async function runMigration() {
  console.log('🚀 Iniciando migración de imágenes para Winners antiguos...');

  try {
    // 1. Buscamos Winners que NO tengan imágenes locales aún
    const res = await pool.query(`
      SELECT id, marketing_copy, competitor_data, target_country 
      FROM products 
      WHERE status = 'WINNER' 
      AND (local_images IS NULL OR local_images = '[]'::jsonb)
    `);

    console.log(`📦 Encontrados ${res.rows.length} productos para procesar.`);

    for (const product of res.rows) {
      console.log(`\n🔎 Procesando ID: ${product.id}...`);

      try {
        // A. Extraer el headline para Serper
        // Ajustamos según como guardaste el JSON (marketing_copy.headline)
        const headline = product.marketing_copy?.headline || 'Producto tendencia';
        
        console.log(`📸 Buscando en Serper: "${headline}"`);
        const serperImages = await serper.getLifestyleImages(headline);

        // B. Extraer imágenes originales de AliExpress del JSON competitor_data
        // Nota: Ajusta la ruta del JSON según tu estructura exacta de RapidAPI
        const aliImages = product.competitor_data?.result?.item?.images || [];
        let localImages = [];

        if (aliImages.length > 0) {
          console.log(`☁️ Subiendo ${Math.min(aliImages.length, 5)} fotos a GCS Santiago...`);
          localImages = await Promise.all(
            aliImages.slice(0, 5).map((url: string, i: number) => 
              media.downloadAndUploadImage(url, product.id, i)
            )
          );
        }

        // 2. Update en la Base de Datos
        await pool.query(`
          UPDATE products SET 
            serper_images = $1, 
            local_images = $2,
            updated_at = NOW() 
          WHERE id = $3`,
          [JSON.stringify(serperImages), JSON.stringify(localImages), product.id]
        );

        console.log(`✅ Producto ${product.id} actualizado con éxito.`);
        
        // Pausa de cortesía para no saturar APIs en el bucle
        await new Promise(r => setTimeout(r, 2000));

      } catch (err) {
        console.error(`❌ Error procesando producto ${product.id}:`, err);
      }
    }

    console.log('\n✨ Migración finalizada.');
  } catch (error) {
    console.error('💥 Error crítico en la migración:', error);
  } finally {
    await pool.end();
  }
}

runMigration();