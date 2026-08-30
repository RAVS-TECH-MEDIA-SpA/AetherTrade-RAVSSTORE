import { pool } from '../lib/db.js';
import { GeminiService } from '../gemini.service.js';

const gemini = new GeminiService();

async function runHtmlBackfill() {
  console.log("⚙️ Iniciando Backfill: Traducción de HTML Técnico para CJ Dropshipping...");
  
  const client = await pool.connect();

  try {
    // Seleccionamos productos de CJ (tienen description en raw_details) 
    // que aún NO tienen la clave technical_html_localized en marketing_copy
    const { rows: products } = await client.query(`
      SELECT id, raw_details->>'description' as cj_html
      FROM products 
      WHERE raw_details->>'description' IS NOT NULL 
      AND (marketing_copy->>'technical_html_localized') IS NULL
    `);

    console.log(`📊 Encontrados ${products.length} productos pendientes de traducción HTML.`);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`[${i + 1}/${products.length}] Procesando producto ID: ${product.id}`);

      if (!product.cj_html || product.cj_html.trim() === '') {
        console.log(`  ↪ HTML vacío, saltando.`);
        continue;
      }

      const translatedHtml = await gemini.translateHTML(product.cj_html);

      // Inyección segura JSONB: Agrega o actualiza la clave technical_html_localized
      // sin destruir los datos preexistentes del objeto marketing_copy.
      await client.query(`
        UPDATE products 
        SET marketing_copy = jsonb_set(
          COALESCE(marketing_copy, '{}'::jsonb), 
          '{technical_html_localized}', 
          to_jsonb($1::text)
        ),
        updated_at = NOW()
        WHERE id = $2
      `, [translatedHtml, product.id]);

      console.log(`  ✅ HTML traducido e inyectado correctamente.`);
      
      // Delay de 2 segundos para no saturar la cuota (429) de Vertex AI
      await new Promise(res => setTimeout(res, 2000));
    }

    console.log("🚀 Backfill completado exitosamente.");
  } catch (error) {
    console.error("🚨 Error crítico durante el backfill:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runHtmlBackfill();