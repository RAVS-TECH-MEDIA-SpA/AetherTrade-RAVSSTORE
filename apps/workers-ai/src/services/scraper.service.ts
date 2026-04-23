import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Reconstrucción de rutas para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AJUSTE DE RUTA (Lógica de Monorepo):
 * src/services/scraper.service.ts
 * ../          -> src/
 * ../../       -> workers-ai/
 * ../../../    -> apps/
 * ../../../../ -> RAIZ (Aquí vive tu .env único)
 */
const rootEnvPath = path.resolve(__dirname, '../../../../.env');

// Intentamos cargar el .env si no ha sido cargado por el index.ts
dotenv.config({ path: rootEnvPath });

export class ScraperService {
  private apiKey: string;

  constructor() {
    // Asignación explícita para asegurar persistencia en la instancia
    this.apiKey = process.env.SERPER_API_KEY || '';

    console.log('\n--- [ScraperService] Diagnóstico Serper ---');
    if (this.apiKey) {
      console.log(`✅ API Key Detectada: ${this.apiKey.substring(0, 5)}...`);
    } else {
      console.log('❌ ERROR: SERPER_API_KEY no encontrada en process.env');
      console.log(`📂 Buscando en: ${rootEnvPath}`);
    }
    console.log('-------------------------------------------\n');
  }

  async getCompetitorPrices(productName: string, country: string) {
    // Validación de seguridad antes de cada llamada
    if (!this.apiKey) {
      throw new Error('ScraperService: No se puede realizar la búsqueda sin SERPER_API_KEY configurada.');
    }

    const isChile = country.toUpperCase() === 'CL';
    const currencyLabel = isChile ? 'CLP' : 'EUR';
    
    const url = 'https://google.serper.dev/search';
    const data = JSON.stringify({
      // "comprar" + "precio" filtra blogs y prioriza tiendas
      "q": `${productName} comprar precio ${currencyLabel}`,
      "gl": country.toLowerCase(), // 'cl' o 'es'
      "hl": "es",
      "num": 10 
    });

    try {
      console.log(`🔎 [Serper] Buscando en mercado: ${country} | Query: ${productName}`);
      
      const response = await axios.post(url, data, {
        headers: { 
          'X-API-KEY': this.apiKey, 
          'Content-Type': 'application/json' 
        }
      });

      const results = response.data.organic || [];

      return results.map((item: any) => {
        // Regex dinámico: Maneja $ o CLP para Chile, y € o EUR para España
        const currencyRegex = isChile 
          ? /(?:\$|CLP)\s?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i 
          : /(\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)/i;

        const match = item.snippet?.match(currencyRegex) || item.title?.match(currencyRegex);
        
        return {
          title: item.title,
          link: item.link,
          snippet: item.snippet,
          // Priorizamos atributos estructurados de Google (Price) si existen
          priceHint: item.attributes?.Price || (match ? match[0] : 'Consultar web'),
          source: new URL(item.link).hostname 
        };
      });

    } catch (error: any) {
      console.error('❌ Error en Serper API:', error.response?.data || error.message);
      throw error;
    }
  }
}