import axios from 'axios';
import { query } from './database'; // Importamos tu conexión a Postgres

export class CompetitorService {
  private apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  private cx = process.env.GOOGLE_SEARCH_CX;
  private CACHE_TTL_HOURS = 12; // Tiempo de vida de la búsqueda

  async getCompetitorPrices(productName: string, countryCode: string): Promise<any[]> {
    // 1. INTENTO DE CACHÉ: Buscamos si ya investigamos esto recientemente
    const cachedData = await this.checkCache(productName, countryCode);
    
    if (cachedData) {
      console.log(`📦 Cache Hit: Usando datos locales para ${productName} (${countryCode})`);
      return cachedData;
    }

    // 2. MISS: Si no hay caché o expiró, vamos a Google
    console.log(`🔍 Cache Miss: Consultando Google Search API para ${productName}`);
    const freshResults = await this.fetchFromGoogle(productName, countryCode);

    // 3. PERSISTENCIA: Guardamos para la próxima vez
    if (freshResults.length > 0) {
      await this.saveToCache(productName, countryCode, freshResults);
    }

    return freshResults;
  }

  private async checkCache(name: string, country: string) {
    const res = await query(
      `SELECT competitor_data FROM products 
       WHERE (sku = $1 OR competitor_data->>'search_query' = $1) 
       AND created_at > NOW() - INTERVAL '${this.CACHE_TTL_HOURS} hours'
       LIMIT 1`,
      [name]
    );
    return res.rows[0]?.competitor_data?.results || null;
  }

  private async saveToCache(name: string, country: string, results: any[]) {
    // Guardamos la búsqueda como un registro de inteligencia
    const payload = { search_query: name, country, results, timestamp: new Date() };
    await query(
      `INSERT INTO products (sku, status, competitor_data) 
       VALUES ($1, 'market_research', $2)
       ON CONFLICT (sku) DO UPDATE SET competitor_data = $2, created_at = NOW()`,
      [`SEARCH_${name.replace(/\s+/g, '_')}`, JSON.stringify(payload)]
    );
  }

  private async fetchFromGoogle(productName: string, countryCode: string) {
    // ... (Misma lógica de axios.get de la respuesta anterior) ...
    // Solo se ejecuta si checkCache devuelve null
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: { key: this.apiKey, cx: this.cx, q: productName }
    });
    return this.parseResults(response.data.items);
  }
}