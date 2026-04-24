import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../../.env');

if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: rootEnvPath });
}

export class TrendService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private pool: pg.Pool;

  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432'),
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Mantenemos Flash 2.5 por velocidad y costo
    //   this.model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-flash-latest", // O "gemini-2.0-flash" si ya tienes acceso estable
        generationConfig: {
            responseMimeType: "application/json", // Crucial para tu flujo de análisis
        }
        });
    } else {
      throw new Error("❌ TrendService: GEMINI_API_KEY no encontrada en el .env");
    }
  }

  async getDynamicNiches(country: string): Promise<string[]> {
    try {
      // 1. Check de Caché (Capa de eficiencia)
      const cacheQuery = `
        SELECT niche_text FROM niche_cache 
        WHERE country_code = $1 AND created_at > NOW() - INTERVAL '24 hours'
      `;
      const cachedRes = await this.pool.query(cacheQuery, [country]);

      if (cachedRes.rows.length > 0) {
        console.log(`♻️  [Cache] Reutilizando ${cachedRes.rows.length} nichos para ${country}`);
        return cachedRes.rows.map(r => r.niche_text);
      }

      // 2. Generación con IA (Si no hay caché)
      console.log(`🧠 [Gemini] Generando palabras clave de búsqueda para: ${country}...`);
      const niches = await this.fetchNichesFromAI(country);

      // 3. Persistencia en Caché
      for (const niche of niches) {
        await this.pool.query(
          'INSERT INTO niche_cache (country_code, niche_text) VALUES ($1, $2)',
          [country, niche]
        );
      }

      return niches;
    } catch (error: any) {
      console.error(`❌ Error en TrendService para ${country}:`, error.message);
      // Fallback a términos genéricos que SIEMPRE traen productos
      return ['Mini Projector', 'Massage Gun', 'Portable Blender', 'LED Strip Lights'];
    }
  }

  private async fetchNichesFromAI(country: string): Promise<string[]> {
    const currentDate = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    /**
     * ESTRATEGIA SENIOR: 
     * Forzamos a Gemini a entregar "Search Terms" (Keywords de producto) 
     * en lugar de "Conceptos de marketing".
     */

        const prompt = `
            Act as an AliExpress SEO & E-commerce Trend Researcher. 
            Generate 8 high-demand search terms for physical products currently trending.

            STRICT RULES:
            1. Use only specific PHYSICAL OBJECTS (e.g., "Vacuum Sealer", "Massage Gun").
            2. NO abstract categories or concepts (e.g., NO "Eco-friendly", use "Solar Powerbank").
            3. Maximum 2 words per term.
            4. Language: English only.
            5. Target: Products under $50 USD with high viral potential.

            Return ONLY a valid JSON array of strings: ["Term 1", "Term 2", ...]
            `;

    const result = await this.model.generateContent(prompt);
    const response = await result.response.text();
    
    // Limpieza de posibles tags de Markdown que Gemini suele incluir
    const cleanJson = response.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanJson);
  }
}