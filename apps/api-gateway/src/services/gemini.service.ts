import { VertexAI } from "@google-cloud/vertexai";
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { MARKET_CONFIG, GLOBAL_MARKUP } from './constants.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

interface Competitor {
  title: string;
  price: number;
  link?: string;
  source: string;
  isSynthetic: boolean;
}

export class GeminiService {
  // Inicialización mediante Vertex AI compartiendo las credenciales
  private vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'aethertrade-core',
    location: 'us-central1'
  });

  private model = this.vertexAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { 
      responseMimeType: "application/json",
      temperature: 0.8, 
    } 
  });

  async generateDynamicNiches(country: string, limit: number, excludedNiches: string[] = []): Promise<string[]> {
    const now = new Date();
    const month = now.toLocaleString('es-CL', { month: 'long' });
    const seed = now.getTime(); 
    const config = MARKET_CONFIG[country as keyof typeof MARKET_CONFIG] || MARKET_CONFIG.CL;

    const exclusionRule = excludedNiches.length > 0 
      ? `\n        CRITICAL EXCLUSION LIST: Forbidden to suggest any of these previously explored niches: [${excludedNiches.join(', ')}].`
      : '';

    const prompt = `
        CONTEXT: Senior Market Intelligence Lead - Cross-border E-commerce Arbitrage.
        OBJECTIVE: Identify ${limit} high-velocity SEO keywords for ${country} in ${month}.
        RANDOMNESS SEED: ${seed}.
        ${exclusionRule}

        STRICT SEARCH-ENGINE RULES:
        1. LANGUAGE: Technical English only.
        2. FORMAT: Pure JSON array of strings.
        3. NO TITLES: Output must be search keywords, NOT product names.
        4. NO SPECS: Forbidden to include technical specs.
        5. WORD LIMIT: Exactly 2 to 3 words per string.
        6. NO BRANDS: Do not include brand names.

        DROPSHIPPING MARKET PARAMETERS (Global Scale & Blue Ocean):
        - Focus: Lightweight, high-margin, impulse-buy gadgets, smart home problem-solvers, ergonomic wellness, or pet technology.
        - Retail Gap: Items with high perceived value that are hard to find in standard local retail or hardware stores.
        - Logistics constraints: Strictly AVOID heavy items, large dimensions, liquids, industrial machinery, weapons, or highly fragile materials.
        - Seasonality: Consider the specific weather and cultural needs for ${month} in ${country}.
        
        PROFITABILITY: Net Margin > $${config.SAFETY_MARGIN.toFixed(2)} USD.`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const startJson = text.indexOf('[');
      const endJson = text.lastIndexOf(']') + 1;
      
      if (startJson === -1 || endJson === 0) {
        throw new Error("Formato JSON no encontrado.");
      }

      return JSON.parse(text.substring(startJson, endJson));

    } catch (error) {
      console.error("❌ Error en Discovery IA:", error);
      return ["heated insoles", "electric mug warmer", "dehumidifier bags"];
    }
  }
}