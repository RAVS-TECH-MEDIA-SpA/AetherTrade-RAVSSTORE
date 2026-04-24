import { PubSub } from '@google-cloud/pubsub';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ScraperService } from '../services/scraper.service.js';
import { GeminiService } from '../gemini.service.js';

// 1. CARGA DE ENTORNO (Prioridad absoluta)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnvPath });

// 2. CONFIGURACIÓN DEL POOL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD || ''),
  port: parseInt(process.env.DB_PORT || '5432'),
});

const pubsub = new PubSub();
const scraper = new ScraperService();
const gemini = new GeminiService();

// Helper para respetar los límites de la API de Gemini (Rate Limiting)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function listenForCandidates() {
  /**
   * 🚀 AJUSTE SENIOR: Flow Control
   * maxMessages: 1 obliga al worker a procesar de a uno.
   * Esto, sumado al sleep, evita el error 429 (Too Many Requests).
   */
  const subscription = pubsub.subscription('candidate-analysis-sub', {
    flowControl: {
      maxMessages: 1
    }
  });
  
  console.log('📡 AnalysisWorker: Escuchando mensajes de Pub/Sub...');

  subscription.on('message', async (message) => {
    const data = JSON.parse(message.data.toString());
    const { dbId, itemId, targetCountry } = data;
    
    try {
      console.log(`🔍 Analizando: ${itemId} (${targetCountry})...`);

      // 1. Obtener datos técnicos y fiscales
      const dbRes = await pool.query(`
        SELECT p.*, t.vat_rate, t.currency_code 
        FROM products p 
        JOIN tax_rules t ON p.target_country = t.country_code 
        WHERE p.id = $1`, [dbId]);

      if (dbRes.rows.length === 0) {
        message.ack();
        return;
      }

      const product = dbRes.rows[0];

      // 2. Scrapping de competencia (Serper)
      const marketResults = await scraper.getCompetitorPrices(product.title_original, targetCountry);

      // 3. IA: Cálculo de rentabilidad y Veredicto
      const analysis = await gemini.analyzeArbitrage(
        { 
          title: product.title_original, 
          price: parseFloat(product.base_cost_usd), 
          shipping: parseFloat(product.shipping_cost_usd || "0") 
        },
        marketResults,
        targetCountry,
        parseFloat(product.vat_rate || "0")
      );

      // 4. Update Final en DB
      const updateQuery = `
        UPDATE products SET 
          status = $1,
          suggested_price_local = $2,
          net_margin_usd = $3,
          roi_percent = $4,
          marketing_copy = $5,
          ai_verdict = $6,
          competitor_data = $7,
          updated_at = NOW()
        WHERE id = $8;
      `;

      await pool.query(updateQuery, [
        analysis.isWinner ? 'WINNER' : 'REJECTED',
        analysis.suggestedPriceLocal,
        analysis.netMarginUsd,
        analysis.roiPercent,
        JSON.stringify(analysis.marketingCopy),
        analysis.verdict,
        JSON.stringify(marketResults),
        dbId
      ]);

      console.log(`✅ [${targetCountry}] ${itemId}: ${analysis.isWinner ? 'WINNER 🔥' : 'REJECTED ❌'}`);
      
      // Confirmamos éxito a la nube
      message.ack();

      /**
       * ⏳ PAUSA DE SEGURIDAD
       * Esperamos 4 segundos antes de que 'flowControl' permita el siguiente mensaje.
       * Esto nos mantiene dentro de la cuota gratuita/estándar de Gemini.
       */
      await sleep(4000);

    } catch (error: any) {
      if (error.message.includes('429')) {
        console.warn(`⚠️ Cuota Gemini excedida para ${itemId}. Reintentando...`);
        message.nack(); // Devuelve el mensaje a la cola para intentar más tarde
      } else {
        console.error(`❌ Error crítico en ${itemId}:`, error.message);
        message.ack(); // Lo quitamos de la cola si es un error de código para no buclear
      }
    }
  });
}