import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './lib/db.js';
import { TrendService } from './services/trend.service.js';
import { AliExpressService } from './aliexpress.service.js';

// 1. Cargar variables locales con ruta absoluta segura
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Subimos 4 niveles: src -> workers-ai -> apps -> monorepo-root
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function runSmokeTest() {
  console.log('🧪 Iniciando Smoke Test Local V1.0.4...');
  console.log(`🔌 Entorno: ${process.env.DATABASE_URL ? 'PRODUCCIÓN' : 'DESARROLLO (Local)'}`);

  const trendService = new TrendService();
  const aliService = new AliExpressService();

  try {
    // PASO 1: Gemini
    console.log('\n--- PASO 1: Consultando Gemini ---');
    const niches = await trendService.getDynamicNiches('CL');
    const singleNiche = niches[0];
    console.log(`✅ Gemini OK. Nicho: "${singleNiche}"`);

    // PASO 2: AliExpress
    console.log('\n--- PASO 2: Consultando AliExpress ---');
    const items = await aliService.searchTrending(singleNiche, 'CL');
    
    if (items.length === 0) {
      console.log('⚠️ No se encontraron productos. Abortando.');
      return;
    }

    const item = items[0];
    console.log(`✅ Ali OK. ID: ${item.aliexpress_id}`);

    // PASO 3: Persistencia (EL FIX ESTÁ AQUÍ)
    console.log('\n--- PASO 3: Persistiendo en DB ---');
    
    // El ON CONFLICT debe coincidir con la restricción del init.sql
    const query = `
      INSERT INTO products (
        aliexpress_id, title_original, base_cost_usd, 
        rating, sales_count, status, target_country
      )
      VALUES ($1, $2, $3, $4, $5, 'CANDIDATE', $6)
      ON CONFLICT (aliexpress_id, target_country) 
      DO UPDATE SET 
        updated_at = NOW(),
        base_cost_usd = EXCLUDED.base_cost_usd
      RETURNING id;
    `;
    
    const res = await pool.query(query, [
      item.aliexpress_id,
      item.title,
      item.price,
      item.rating,
      item.sales,
      'CL'
    ]);

    console.log(`✅ [EXITO] ID DB: ${res.rows[0].id}`);

  } catch (error: any) {
    console.error('\n❌ [ERROR DURANTE EL TEST]:');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    console.log('\n🧹 Cerrando conexiones...');
    await pool.end();
    console.log('🏁 Test finalizado.');
    process.exit(0);
  }
}

runSmokeTest();