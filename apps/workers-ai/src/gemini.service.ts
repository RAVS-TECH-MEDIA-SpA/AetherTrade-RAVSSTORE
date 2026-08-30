import { VertexAI } from "@google-cloud/vertexai";
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { MARKET_CONFIG } from './config/constants.js';

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
  // Inicialización mediante Vertex AI (Utiliza GOOGLE_APPLICATION_CREDENTIALS)
  private vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'aethertrade-core',
    location: 'us-central1'
  });

  // Modelo instanciado para respuestas en JSON estructurado
  private model = this.vertexAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
    generationConfig: { 
      responseMimeType: "application/json",
      temperature: 0.8, 
    } 
  });

 // ⚡ MOTOR INTERNO DE REINTENTOS CON TIMEOUT Y JITTER
  private async generateContentWithRetry(prompt: string, maxRetries = 4): Promise<any> {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        // ESCUDO: Si Gemini no responde en 20 segundos, lo matamos para no colgar Cloud Run
        const response: any = await Promise.race([
          this.model.generateContent(prompt),
          new Promise((_, reject) => setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 60000))
        ]);
        return response;
      } catch (error: any) {
        // Atrapamos el Timeout o el error 429 de Cuota
        if ((error.message && error.message.includes('429')) || error.message === 'GEMINI_TIMEOUT') {
          retries++;
          const reason = error.message === 'GEMINI_TIMEOUT' ? 'Timeout (20s)' : 'Cuota excedida (429)';
          
          const baseWait = Math.pow(2, retries) * 2500; 
          const jitter = Math.floor(Math.random() * 4000); 
          const backoffTime = baseWait + jitter;

          console.warn(`⚠️ [VERTEX AI] ${reason}. Reintento ${retries}/${maxRetries} en ${(backoffTime / 1000).toFixed(1)}s...`);
          await new Promise(res => setTimeout(res, backoffTime));
        } else {
          throw error; 
        }
      }
    }
    throw new Error(`[VertexAI] Falló tras ${maxRetries} reintentos.`);
  }

  /**
   * Traduce una lista de atributos técnicos al idioma destino en un solo bloque.
   */
  async translateAttributes(attributes: any[], targetLang: string): Promise<any[]> {
    const prompt = `Traduce esta lista técnica de productos al ${targetLang}. 
    Devuelve SOLO un array JSON: [{"name": "traducido", "value": "traducido"}].
    Lista: ${JSON.stringify(attributes)}`;
    
    try {
      const result = await this.generateContentWithRetry(prompt);
      const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      return JSON.parse(textResult.replace(/```json|```/g, ""));
    } catch (error) {
      console.error("❌ Error en translateAttributes:", error);
      return attributes; // Fallback: si todo falla, devolvemos los originales para no crashear
    }
  }

  /**
   * Refactoriza títulos de productos para SEO de e-commerce.
   */
  async translateForSearch(title: string, targetLang: string): Promise<string> {
    const prompt = `
        TAREA: Refactorizar títulos de productos para SEO de e-commerce.
        ORIGINAL: ${title}
        IDIOMA OBJETIVO: ${targetLang}

        REGLAS:
        1. Extrae el "Core Entity" del producto.
        2. Añade el beneficio principal o característica técnica clave.
        3. Máximo 4 palabras. Sin adjetivos vacíos ni marcas.
        
        FORMATO DE SALIDA: 
        Entrega únicamente el texto plano del título refactorizado. 
        Prohibido incluir etiquetas como "tituloseo:", "SALIDA:", o introducciones.
      `;
    
    try {
      const result = await this.generateContentWithRetry(prompt);
      const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return textResult.trim();
    } catch (error) {
      console.warn("⚠️ Falló translateForSearch. Usando fallback de título.");
      return title.split(' ').slice(0, 3).join(' ');
    }
  }

  /**
   * Motor de Análisis Financiero (CFO) y Copywriting Integrado para Meta Ads
   */
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
    
    // Extraemos la información técnica sin saturar el contexto de tokens
    const technicalSpecs = JSON.stringify(aliData.properties?.slice(0, 15) || []);
    const manufacturerDescription = aliData.extended_text ? aliData.extended_text.substring(0, 1500) : 'Sin descripción adicional.';

    const prompt = `
      Actúa como un CFO y Copywriter de tecnología High-End experto en E-commerce. 
      Tu misión es evaluar la viabilidad financiera, crear el material de venta premium y definir la segmentación para Meta Ads del producto: "${aliData.title}".

      ### 1. DATA ECONÓMICA (INPUT):
      - Costo de Adquisición Total: ${landedCostUsd.toFixed(2)} USD.
      - TIPO DE CAMBIO: 1 USD = ${rateToUsd} ${currency}.
      - Competencia Local Mínima detectada: ${minCompPriceLocal} ${currency}.
      - Impuestos Aplicables (IVA/VAT): ${taxRate}%.
      - Comisión de Pasarela de Pagos (Estimada): 5%.

      ### 2. DATA TÉCNICA DEL PRODUCTO:
      - Especificaciones: ${technicalSpecs}
      - Descripción del Fabricante: ${manufacturerDescription}

      ### 3. PROTOCOLO DE PRICING ESTRATÉGICO Y CPA:
      - ESCENARIO COMPETITIVO: Si existe competencia real (${!hasSynthetic}), asume un posicionamiento PREMIUM. El 'suggestedPriceLocal' debe priorizar la rentabilidad, calculando un precio que garantice un ROI de al menos 30% sobre el costo total, incluso si queda por encima de la competencia.
      - ESCENARIO DE EXCLUSIVIDAD: Si es "Aether-Market-Engine" (${hasSynthetic}), optimiza el precio para obtener un ROI entre 100% y 200%.
      - CÁLCULO DE CPA MÁXIMO: cpaMaxLocal = Margen Neto (en ${currency}) * 0.60. (El 60% del margen se destina a Meta Ads).

      ### 4. LÓGICA DE DECISIÓN (WINNER & ADS):
      - "isWinner" = true SOLO SI el modelo financiero proyecta un Margen Neto de al menos $${config.SAFETY_MARGIN.toFixed(2)} USD después de costos e impuestos.
      - "isViableForAds" = true SOLO SI el cpaMaxLocal calculado es >= ${targetCountry === 'CL' ? '1800' : '2.00'} ${currency}.

      ### 5. REGLAS DE COPYWRITING Y SEGMENTACIÓN META ADS:
      - TÍTULO: Máximo 60 caracteres en ${targetCountry === 'CL' ? 'Español' : 'Inglés'}.
      - HOOK: Frase disruptiva que detenga el scroll.
      - BENEFICIOS: Lista de 3 a 4 puntos clave, extraídos de la data técnica.
      - DESCRIPCIÓN: Párrafo persuasivo, técnico y formal.
      - META TARGETING: Define un 'buyer_persona' claro, lista 3 a 5 'interests' exactos que existan en Facebook Ads, y define el 'marketing_angle' (ej. Ahorro de tiempo, Estatus, Solución a un problema).

      ### 6. PROTOCOLO DE SALIDA (JSON ESTRICTO):
      - Responde ÚNICAMENTE con un objeto JSON válido.
      
      Estructura requerida:
      {
        "isWinner": boolean,
        "analysis": {
          "suggestedPriceLocal": number,
          "estimatedRoi": number,
          "netMarginUsd": number,
          "cpaMaxLocal": number,
          "cpaMaxLocalCurrency": "${currency}",
          "isViableForAds": boolean,
          "reasoning": "string"
        },
        "copywriting": {
          "title_localized": "string",
          "hook": "string",
          "benefits": ["string", "string"],
          "description_localized": "string"
        },
        "meta_targeting": {
          "buyer_persona": "string",
          "interests": ["string", "string"],
          "marketing_angle": "string"
        }
      }

      ANÁLISIS ESTRATÉGICO FINALIZADO. RESPONDE SOLO EL JSON:`;

    try {
      const result = await this.generateContentWithRetry(prompt);
      const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = textResult.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.copywriting && parsed.copywriting.description && !parsed.copywriting.description_localized) {
        parsed.copywriting.description_localized = parsed.copywriting.description;
      }

      // Asegurar que el bloque meta_targeting se integre dentro de marketing_copy en la BD
      return {
        ...parsed,
        landedCostUsd
      };
    } catch (error: any) {
      console.error("❌ Error parseando Gemini Arbitrage:", error.message || error);
      
      // Fallback actualizado con la nueva estructura
      return { 
        isWinner: false, 
        analysis: { suggestedPriceLocal: 0, estimatedRoi: 0, netMarginUsd: 0, cpaMaxLocal: 0, isViableForAds: false }, 
        copywriting: {},
        meta_targeting: {} 
      };
    }
  }

  async askGenericPrompt(prompt: string): Promise<string> {
    try {
      const result = await this.generateContentWithRetry(prompt);
      const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      // Limpiamos comillas accidentales y espacios
      return textResult.replace(/['"]/g, '').trim(); 
    } catch (error) {
      console.warn("⚠️ Falló askGenericPrompt. Devolviendo string vacío.");
      return '';
    }
  }

  /**
   * Traduce nodos de texto de un string HTML conservando intactas las etiquetas y atributos.
   */
  async translateHTML(rawHtml: string): Promise<string> {
    if (!rawHtml || rawHtml.trim() === '') return '';

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
      const result = await this.generateContentWithRetry(prompt);
      const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || rawHtml;
      // Sanitizamos cualquier envoltura residual de markdown que el modelo pueda inyectar
      return textResult.replace(/```html|```/g, "").trim();
    } catch (error) {
      console.warn("⚠️ [Gemini Warn] Falló translateHTML. Retornando HTML original crudo.", error);
      return rawHtml; // Fallback de seguridad: preservamos el diseño aunque no esté traducido
    }
  }
}