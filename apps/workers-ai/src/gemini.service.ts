import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { MARKET_CONFIG, GLOBAL_MARKUP } from '../src/config/constants.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

interface Competitor {
  title: string;
  price: number;
  link?: string;
  source: string;
  isSynthetic: boolean;
}

export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private model = this.genAI.getGenerativeModel({ 
    model: "gemini-3.1-pro-preview", 
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

    // Preparamos la restricción de memoria si existen nichos previos
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
        4. NO SPECS: Forbidden to include technical specs (e.g., "200W", "12V", "5L", "Fast Charge").
        5. WORD LIMIT: Exactly 2 to 3 words per string.
        6. NO BRANDS: Do not include brand names (e.g., "Xiaomi", "Apple").

        MARKET PARAMETERS (Southern Hemisphere Context):
        - SEASONALITY: Late Autumn/Winter transition in ${country}. Focus on cold weather, humidity, and home comfort.
        - PORTFOLIO MIX:
            * 30% Seasonal (Heating, insulation, winter apparel).
            * 40% Practical Problem-Solvers (Home maintenance, efficiency).
            * 30% Viral/Visual Trends (High social media engagement potential).
        
        PROFITABILITY FILTER:
        - Only suggest niches capable of sustaining a Net Margin > $${config.SAFETY_MARGIN.toFixed(2)} USD after shipping to ${country}.

        EXAMPLES OF GOOD KEYWORDS: ["electric foot warmer", "mini dehumidifier", "windproof umbrella", "fleece car cover"].
        EXAMPLES OF BAD OUTPUT (PROHIBITED): ["Pro Electric Heater 2000W for Home", "12V Heated Car Seat Cover Black"].`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      // OPTIMIZACIÓN: Extraemos el contenido entre el primer '[' y el último ']'
      // Esto ignora cualquier texto explicativo o markdown que Gemini añada por error.
      const startJson = text.indexOf('[');
      const endJson = text.lastIndexOf(']') + 1;
      
      if (startJson === -1 || endJson === 0) {
        throw new Error("No se encontró un formato de array válido en la respuesta de la IA.");
      }

      const jsonString = text.substring(startJson, endJson);
      return JSON.parse(jsonString);

    } catch (error) {
      console.error("❌ Error en Discovery IA:", error);
      // Fallback robusto y contextual para evitar que el proceso se detenga
      return ["heated insoles", "electric mug warmer", "dehumidifier bags", "winter car cover"];
    }
}

  async translateForSearch(title: string, targetLang: string): Promise<string> {
    const prompt = `
      TAREA: Refactorizar títulos de productos para SEO de e-commerce.
      ORIGINAL: ${title}
      IDIOMA OBJETIVO: ${targetLang}
      
      REGLAS:
      1. Extrae el "Core Entity" del producto (ej: "Proyector", "Humidificador").
      2. Añade el beneficio principal o característica técnica clave.
      3. Máximo 4 palabras. Sin adjetivos vacíos ("amazing", "cheap"). Sin marcas.
      
      SALIDA: Solo el texto plano purificado en ${targetLang}.`;
    
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      return title.split(' ').slice(0, 3).join(' ');
    }
  }

  async analyzeArbitrage(
    aliData: any, 
    competitors: Competitor[], 
    targetCountry: string, 
    taxRate: number,
    landedCostUsd: number,
    rateToUsd: number 
  ) {
    const hasSynthetic = competitors.some(c => c.isSynthetic);
    const minCompPriceLocal = competitors.length > 0 ? Math.min(...competitors.map(c => c.price)) : 0;
    const currency = targetCountry === 'CL' ? 'CLP' : 'USD';

    // CARGA DE CONFIGURACIÓN DINÁMICA POR PAÍS
    const config = MARKET_CONFIG[targetCountry as keyof typeof MARKET_CONFIG] || MARKET_CONFIG.CL;
    
    const prompt = `
      Actúa como un CFO y Director de Marketing de E-commerce experto en Arbitraje Internacional. 
      Tu misión es evaluar la viabilidad financiera y crear el material de venta para el producto: "${aliData.title}".

      ### 1. DATA ECONÓMICA (INPUT):
      - Costo de Adquisición Total: ${landedCostUsd.toFixed(2)} USD.
      - TIPO DE CAMBIO: 1 USD = ${rateToUsd} ${currency}.
      - Competencia Local Mínima detectada: ${minCompPriceLocal} ${currency}.
      - Impuestos Aplicables (IVA/VAT): ${taxRate}%.
      - Comisión de Pasarela de Pagos (Estimada): 5%.

      ### 2. PROTOCOLO DE PRICING ESTRATÉGICO:
      - ESCENARIO COMPETITIVO: Si existe competencia real (${!hasSynthetic}), el 'suggestedPriceLocal' debe posicionarse un 4% por debajo del precio mínimo de la competencia para capturar volumen de mercado rápidamente.
      - ESCENARIO DE EXCLUSIVIDAD: Si el competidor es "Aether-Market-Engine" (Sintético: ${hasSynthetic}), estás ante un 'Océano Azul'. Optimiza el precio para obtener un ROI de entre el 100% y el 250% según la utilidad percibida.

    
      ### 3. LÓGICA DE DECISIÓN (WINNER):
      - MARCAR "isWinner" COMO TRUE SOLO SI:
        - El ROI Final es > 15% tras descontar impuestos y comisiones (Calcula convirtiendo el Costo USD a ${currency} usando el tipo de cambio ${rateToUsd}).
        - El Margen Neto es > $${config.SAFETY_MARGIN.toFixed(2)} USD.


      ### 4. REGLAS DE COPYWRITING (AIDA):
      - TÍTULO: Máximo 60 caracteres, en idioma ${targetCountry === 'CL' ? 'Español' : 'Inglés'}, enfocado en el beneficio principal y SEO.
      - HOOK: Una frase disruptiva que detenga el scroll en ${targetCountry === 'CL' ? 'Español' : 'Inglés'}.
      - BENEFICIOS: Lista de 3 puntos clave enfocados en la transformación del usuario.
      - DESCRIPCIÓN: Máximo 300 caracteres persuasivos con un Call to Action (CTA) implícito.

      ### 5. PROTOCOLO DE SALIDA (JSON ESTRICTO):
      - Debes responder ÚNICAMENTE con un objeto JSON válido. No incluyas introducciones ni conclusiones.
      
      Estructura requerida:
      {
        "isWinner": boolean,
        "analysis": {
          "suggestedPriceLocal": number,
          "estimatedRoi": number,
          "netMarginUsd": number,
          "reasoning": "Explicación en el idioma del país"
        },
        "copywriting": {
          "title_localized": "string",
          "hook": "string",
          "benefits": ["string", "string", "string"],
          "description": "string"
        }
      }

      ANÁLISIS ESTRATÉGICO FINALIZADO. RESPONDE SOLO EL JSON:`;

    try {
      const result = await this.model.generateContent(prompt);
      const cleanJson = result.response.text().replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      return {
        ...parsed,
        landedCostUsd
      };
    } catch (error) {
      console.error("❌ Error parseando Gemini Arbitrage:", error);
      return { isWinner: false, analysis: { suggestedPriceLocal: 0, estimatedRoi: 0, netMarginUsd: 0 }, copywriting: {} };
    }
  }
}