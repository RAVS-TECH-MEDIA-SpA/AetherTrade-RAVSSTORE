import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { pool } from '../lib/db.js';

/**
 * TrendService - Versión Senior Centralizada
 * Maneja la generación de nichos con Gemini y el caché en PostgreSQL.
 */
export class TrendService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private pool = pool; // Usamos el pool centralizado de lib/db.js

  constructor() {
    // 1. Cargamos la API Key desde las variables de entorno (GCP ya las provee)
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("❌ TrendService: GEMINI_API_KEY no encontrada en el entorno.");
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    // 2. Configuramos el modelo Gemini (Flash 1.5 es ideal por balance costo/velocidad)
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-pro", // Cambia a "gemini-3.1-pro-preview" si quieres la última versión (más costosa)
      generationConfig: {
        responseMimeType: "application/json",
      }
    });
    console.log("🔥 [VERSION_CHECK]: 10:13 AM - INTENTO FINAL V1.0.4");
    console.log("🤖 [TrendService]: Inicializado correctamente.");
  }

  /**
   * Obtiene nichos dinámicos. Primero busca en DB (24h caché), 
   * si no hay, consulta a la IA.
   */
  async getDynamicNiches(country: string): Promise<string[]> {
    try {
      // 1. Check de Caché (Capa de eficiencia para no quemar tokens/créditos)
      const cacheQuery = `
        SELECT niche_text FROM niche_cache 
        WHERE country_code = $1 AND created_at > NOW() - INTERVAL '24 hours'
      `;
      const cachedRes = await this.pool.query(cacheQuery, [country]);

      if (cachedRes.rows.length > 0) {
        console.log(`♻️  [Cache]: Reutilizando ${cachedRes.rows.length} nichos para ${country}`);
        return cachedRes.rows.map(r => r.niche_text);
      }

      // 2. Generación con IA (Si no hay caché)
      console.log(`🧠 [Gemini]: Generando tendencias frescas para: ${country}...`);
      const niches = await this.fetchNichesFromAI(country);

      // 3. Persistencia en Caché para las próximas 24 horas
      for (const niche of niches) {
        await this.pool.query(
          'INSERT INTO niche_cache (country_code, niche_text) VALUES ($1, $2)',
          [country, niche]
        );
      }

      return niches;
    } catch (error: any) {
      console.error(`❌ Error en TrendService para ${country}:`, error.message);
      // Fallback Senior: Nunca dejes que el proceso muera, devuelve básicos que venden
      return ['Mini Projector', 'Massage Gun', 'Portable Blender', 'Solar Powerbank'];
    }
  }

  /**
   * Consulta a Gemini bajo un rol de analista de e-commerce.
   */
  private async fetchNichesFromAI(country: string): Promise<string[]> {
    const prompt = `
      Act as an AliExpress SEO & E-commerce Trend Researcher. 
      Generate 15 high-demand search terms for physical products currently trending.

      STRICT RULES:
      1. Use only specific PHYSICAL OBJECTS (e.g., "Vacuum Sealer", "Massage Gun").
      2. NO abstract categories or concepts (e.g., NO "Eco-friendly", use "Solar Powerbank").
      
      3. Language: English only (for AliExpress API compatibility).
      4. Target: Products under $85 USD with high viral potential in ${country}.

      Return ONLY a valid JSON array of strings: ["Term 1", "Term 2", ...]
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response.text();
      
      // Limpieza de tags Markdown por si Gemini se pone creativo
      const cleanJson = response.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.error("❌ [Gemini Error]: Falló la generación de contenido.", err);
      throw err;
    }
  }
}