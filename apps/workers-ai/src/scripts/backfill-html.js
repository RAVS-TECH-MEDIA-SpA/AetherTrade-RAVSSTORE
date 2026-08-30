import pg from 'pg';
import { VertexAI } from '@google-cloud/vertexai';
import path from 'path';

// 1. Inyectamos la ruta absoluta de GCP
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'secrets', 'aether-gcp-credentials.json');

// 2. Conexión segura y DIRECTA a Supabase
// Utilizamos el objeto de configuración en lugar de 'connectionString' para evitar 
// que los caracteres especiales de su contraseña (!, %, +) rompan el parseo de la URL.
const pool = new pg.Pool({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.orzlxytmboxaqjibpnwl',
  password: 'A9t7-HR4b!%ua+u',
  ssl: { rejectUnauthorized: false }
});

// 3. Inicialización de Vertex AI
const vertexAI = new VertexAI({
  project: 'aethertrade-core', // Hardcodeado por seguridad
  location: 'us-central1'
});

const model = vertexAI.getGenerativeModel({ 
  model: "gemini-2.5-flash", 
  generationConfig: { temperature: 0.3 } 
});

async function translateHTML(rawHtml) {
  if (!rawHtml || rawHtml.trim() === '') return null;

  const prompt = `
    TAREA ESTRICTA DE PARSEO Y TRADUCCIÓN.
    Actúa como un procesador de texto automatizado. Traduce los nodos de texto del siguiente código HTML del inglés al español (localización: Chile).

    REGLAS CRÍTICAS:
    1. Traduce SOLAMENTE los nodos de texto visibles.
    2. PROHIBIDO alterar, eliminar o modificar cualquier etiqueta HTML (<div>, <p>, <b>, <img>, <br/>, etc.).
    3. PROHIBIDO alterar los atributos de las etiquetas (src, href, style, class).
    4. Mantén los saltos de línea originales (\\n).
    
    FORMATO DE SALIDA:
    Devuelve ÚNICAMENTE el código HTML traducido. Cero explicaciones, sin introducciones, sin envolturas markdown como \`\`\`html.

    HTML ORIGINAL:
    ${rawHtml}
  `;

  try {
    const response = await model.generateContent(prompt);
    const textResult = response.response.candidates?.[0]?.content?.parts?.[0]?.text || rawHtml;
    return textResult.replace(/```html|```/g, "").trim();
  } catch (error) {
    console.warn("⚠️ [VertexAI Error]:", error.message);
    return null; 
  }
}

async function runHtmlBackfill() {
  console.log("⚙️ Iniciando Backfill con Credenciales Directas de Supabase y GCP...");
  
  const client = await pool.connect();

  try {
    const { rows: products } = await client.query(`
      SELECT id, raw_details->>'description' as cj_html
      FROM products 
      WHERE raw_details->>'description' IS NOT NULL 
      AND (marketing_copy->>'technical_html_localized') IS NULL
    `);

    console.log(`📊 Encontrados ${products.length} productos pendientes.`);

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`[${i + 1}/${products.length}] Procesando ID: ${product.id}`);

      if (!product.cj_html || product.cj_html.trim() === '') continue;

      const translatedHtml = await translateHTML(product.cj_html);

      if (!translatedHtml) {
        console.log(`  ❌ Traducción fallida por permisos o error de red. Omitiendo.`);
        continue;
      }

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
      await new Promise(res => setTimeout(res, 2500));
    }

    console.log("🚀 Backfill completado exitosamente.");
  } catch (error) {
    console.error("🚨 Error crítico:", error);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

runHtmlBackfill();