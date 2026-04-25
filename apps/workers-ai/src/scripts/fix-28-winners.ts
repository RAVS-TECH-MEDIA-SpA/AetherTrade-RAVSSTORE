import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
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

/**
 * Limpia el título para que Google Images no se maree.
 * Ejemplo: "200000mAh Solar Power Bank Portable High Capacity..." 
 * se convierte en "Solar Power Bank Portable"
 */
const sanitizeQuery = (text: string): string => {
  if (!text) return '';
  // Eliminamos números grandes (mAh, Watts) y tomamos las primeras 5 palabras
  return text
    .replace(/\d+mAh|\d+W|\d+V/gi, '')
    .split(' ')
    .filter(word => word.length > 2)
    .slice(0, 5)
    .join(' ');
};

async function fixWinners() {
  console.log('🛠️  Reparación de Emergencia: Optimizando búsquedas en Google...');

  try {
    const res = await pool.query(`
      SELECT * FROM products 
      WHERE status = 'WINNER' 
      AND (local_images IS NULL OR local_images = '[]'::jsonb)
    `);

    console.log(`🔍 Se encontraron ${res.rows.length} productos para procesar.`);

    for (const p of res.rows) {
      try {
        console.log(`\n📦 Procesando: ${p.title_original.substring(0, 60)}...`);
        
        // 1. Buscamos imágenes en Serper con Query Optimizado
        let sImages = Array.isArray(p.serper_images) ? p.serper_images : [];
        
        if (sImages.length === 0) {
          const rawQuery = p.marketing_copy?.headline || p.title_original;
          const cleanQuery = sanitizeQuery(rawQuery);
          
          console.log(`  🔎 Buscando lifestyle con: "${cleanQuery}"`);
          sImages = await serper.getLifestyleImages(cleanQuery);
        }

        // 2. Definir fuentes para el Bucket (Priorizamos Serper, Fallback a la imagen original)
        // Agregamos un fallback a p.image_url si Serper sigue fallando
        const sourcesToUpload = [
          ...sImages, 
          p.image_url
        ].filter(url => url && !url.includes('tiktok.com') && !url.includes('instagram.com'));

        if (sourcesToUpload.length > 0) {
          console.log(`  ⬇️ Intentando subir ${Math.min(sourcesToUpload.length, 3)} fotos a Santiago...`);
          
          const uploaded = await Promise.all(
            sourcesToUpload.slice(0, 3).map((url: string, i: number) => 
              media.downloadAndUploadImage(url, p.id, i)
            )
          );

          const lImages = uploaded.filter(img => img && img !== '');

          // 3. Update en Base de Datos
          await pool.query(
            `UPDATE products SET 
              serper_images = $1, 
              local_images = $2, 
              updated_at = NOW() 
             WHERE id = $3`,
            [JSON.stringify(sImages), JSON.stringify(lImages), p.id]
          );

          console.log(`  ✅ ID ${p.id} sincronizado (${lImages.length} fotos en GCS).`);
        } else {
          console.warn(`  ❌ Sigo sin encontrar fuentes válidas para el ID ${p.id}.`);
        }

        await new Promise(r => setTimeout(r, 1000));

      } catch (err: any) {
        console.error(`  ❌ Error en ID ${p.id}:`, err.message);
      }
    }

    console.log('\n🚀 Proceso finalizado.');

  } catch (error: any) {
    console.error('💥 Error crítico:', error.message);
  } finally {
    await pool.end();
  }
}

fixWinners();