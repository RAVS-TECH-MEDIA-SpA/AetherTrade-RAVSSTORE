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
  private chatModel = this.vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature: 0.65 }
  });

  async answerSalesChat(
    message: string,
    storeName: string,
    catalog: Array<Record<string, unknown>>,
    history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
    mode: 'sales' | 'support' = 'sales'
  ): Promise<string> {
    const roleInstruction = mode === 'support'
      ? 'Prioriza empatía, respuestas claras y resolución de dudas. Si la consulta requiere datos de una orden o un pago, deriva a soporte humano.'
      : 'Asesora para elegir y comprar. Persuade con beneficios comprobables, sin presión ni manipulación.';
    const systemInstruction = `
      Eres la asesora virtual de ventas y soporte de ${storeName}. Responde en español natural,
      con energía y cercanía. ${roleInstruction}
      El catálogo adjunto es la única fuente autorizada para productos, precios, disponibilidad
      y plazos. No inventes stock, descuentos, garantías, urgencia ni características. Si no
      hay una coincidencia, dilo con claridad y pregunta qué necesita el cliente.
      Puedes orientar sobre cómo comprar y envíos generales, pero no tienes acceso a órdenes,
      pagos ni datos privados: deriva esas consultas a soporte humano.
      Recomienda como máximo dos productos relevantes, explica brevemente por qué encajan y
      termina con una pregunta concreta que facilite el siguiente paso.
      No generes URLs ni enlaces. La tienda mostrará tarjetas de producto verificadas aparte.

      CATÁLOGO DISPONIBLE PARA ESTA CONSULTA:
      ${JSON.stringify(catalog)}
    `;
    const chat = this.chatModel.startChat({
      systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] },
      history: history.map(turn => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.text }]
      }))
    });
    const result = await chat.sendMessage(message);
    const reply = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!reply) throw new Error('El asistente no generó una respuesta.');
    return reply;
  }

 async generateDynamicNiches(country: string, limit: number, excludedNiches: string[] = []): Promise<string[]> {
    const now = new Date();
    const month = now.toLocaleString('es-CL', { month: 'long', timeZone: 'UTC' });
    const seed = now.getTime(); 
    const config = MARKET_CONFIG[country as keyof typeof MARKET_CONFIG];
    if (!config) throw new Error(`Mercado no soportado: ${country}`);
    const monthNumber = now.getUTCMonth() + 1;
    const southernSpring = monthNumber >= 9 && monthNumber <= 11;
    const northernSpring = monthNumber >= 3 && monthNumber <= 5;
    const isSpring = config.hemisphere === 'south' ? southernSpring : northernSpring;
    const season = isSpring ? 'spring' : monthNumber >= 6 && monthNumber <= 8
      ? config.hemisphere === 'south' ? 'winter' : 'summer'
      : monthNumber >= 9 && monthNumber <= 11
        ? config.hemisphere === 'south' ? 'spring' : 'autumn'
        : config.hemisphere === 'south' ? 'summer' : 'winter';

    const exclusionRule = excludedNiches.length > 0 
      ? `\n        CRITICAL EXCLUSION LIST: Forbidden to suggest any of these previously explored niches: [${excludedNiches.join(', ')}].`
      : '';

    const prompt = `
        CONTEXT: Senior Market Intelligence Lead - Cross-border E-commerce Arbitrage.
        OBJECTIVE: Identify ${limit} evidence-led product niches for ${config.name} (${country}) in ${month}, during local ${season}.
        RANDOMNESS SEED: ${seed}.
        ${exclusionRule}

        STRICT SEARCH-ENGINE RULES:
        1. LANGUAGE: Technical English only.
        2. FORMAT: Pure JSON array of strings.
        3. NO TITLES: Output must be search keywords, NOT product names.
        4. NO SPECS: Forbidden to include technical specs.
        5. WORD LIMIT: Exactly 2 to 3 words per string.
        6. NO BRANDS: Do not include brand names.

        MARKET AND SEASONALITY:
        - Use ${config.currency} price expectations and Spanish-language demand for ${config.name}.
        - Favor niches whose buying intent is timely for local ${season} and ${month}; account for the country's hemisphere and retail calendar.
        - Explore multiple practical categories (home, tools, travel, pet, automotive, personal technology and outdoor) instead of repeating one niche.
        - Favor compact products with clear utility, repeatable demand, reliable shipping and a plausible local retail gap.
        - Exclude regulated or safety-critical products, counterfeit-branded goods, fragile or bulky products, and niches whose seasonal demand has already passed.
        - Do not claim live trend or sales evidence. Return search terms suitable for CJ catalog validation.
        
        PROFITABILITY: Net Margin > $${config.SAFETY_MARGIN.toFixed(2)} USD.`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const startJson = text.indexOf('[');
      const endJson = text.lastIndexOf(']') + 1;
      
      if (startJson === -1 || endJson === 0) {
        throw new Error("Formato JSON no encontrado.");
      }

      const niches = JSON.parse(text.substring(startJson, endJson));
      if (!Array.isArray(niches)) throw new Error('La respuesta de nichos no es un array.');
      return [...new Set(niches.map(value => String(value).trim()).filter(Boolean))].slice(0, limit);

    } catch (error) {
      console.error("❌ Error en Discovery IA:", error);
      const marketFallbacks: Record<string, string[]> = {
        CL: ['portable car organizer', 'smart garden sensor', 'travel power adapter'],
        MX: ['solar garden light', 'portable car organizer', 'smart home sensor']
      };
      return (marketFallbacks[country] || marketFallbacks.CL).slice(0, limit);
    }
  }
}