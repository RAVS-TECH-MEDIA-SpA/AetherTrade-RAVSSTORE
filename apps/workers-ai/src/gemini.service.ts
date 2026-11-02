import { VertexAI } from "@google-cloud/vertexai";
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { MARKET_CONFIG } from './config/constants.js';
import * as cheerio from 'cheerio';

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
    // CARGA DE CONFIGURACIÓN DINÁMICA POR PAÍS
    const config = MARKET_CONFIG[targetCountry as keyof typeof MARKET_CONFIG];
    if (!config) throw new Error(`Mercado no soportado: ${targetCountry}`);
    const currency = config.currency;
    
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
      - "isViableForAds" = true SOLO SI el cpaMaxLocal calculado es >= ${config.MIN_CPA_LOCAL} ${currency}.

      ### 5. REGLAS DE COPYWRITING Y SEGMENTACIÓN META ADS:
      - TÍTULO: Máximo 60 caracteres en ${config.language}.
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

  try {
    // 1. Cargar el HTML original en Cheerio
    // const $ = cheerio.load(rawHtml, { decodeEntities: false }, false);

    // 1. Cargar el HTML original en Cheerio con la sintaxis moderna
      const $ = cheerio.load(rawHtml, {
        xml: {
          decodeEntities: false // Evita que transforme tildes y eñes en caracteres extraños
        }
      });
    
    const textNodes: { index: number; originalText: string; element: any }[] = [];
    let counter = 0;

    // 2. Recorrer el DOM y extraer solo los nodos de texto que tengan contenido real
    $('*').each((_, element) => {
      $(element).contents().each((_, node) => {
        // Buscamos nodos tipo TEXTO (type 3) que no estén vacíos ni sean solo saltos de línea
        if (node.type === 'text' && node.data && node.data.trim().length > 0) {
          // Ignoramos nodos de texto que estén dentro de etiquetas de script o estilos por seguridad
          const parentTag = $(element).prop('tagName')?.toLowerCase();
          if (parentTag !== 'script' && parentTag !== 'style') {
            textNodes.push({
              index: counter++,
              originalText: node.data.trim(),
              element: node // Guardamos la referencia física del nodo para mutarlo después
            });
          }
        }
      });
    });

    // Si el HTML no contiene texto traducible (solo imágenes, por ejemplo), lo devolvemos intacto
    if (textNodes.length === 0) return rawHtml;

    // 3. Preparar los datos limpios para Gemini (Solo strings planos)
    const payloadToTranslate = textNodes.map(node => ({
      id: node.index,
      text: node.originalText
    }));

    const prompt = `
      Eres un sistema de traducción automatizado experto en localización para el mercado de e-commerce en Chile.
      Traduce el siguiente array de textos del inglés al español chileno (ej. usa "Caja de pañuelos" en vez de "Caja de pañuelitos", mantén terminología de retail formal y natural).

      REGLAS ESTRICTAS:
      1. Traduce ÚNICAMENTE el campo "text". Preserva el "id" exactamente igual.
      2. No agregues, quites ni fusiones elementos del array. La salida debe tener el mismo largo.
      3. Devuelve estrictamente el formato JSON solicitado.

      DATA A TRADUCIR:
      ${JSON.stringify(payloadToTranslate)}
    `;

    // 4. Consumir Gemini usando tu 'jsonModel' configurado globalmente
    // Pasamos el "this.model" que ya tiene configurado el responseMimeType: "application/json"
    const result = await this.generateContentWithRetry(prompt);
    const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    // Limpiamos posibles envolturas de markdown que la IA agregue por inercia
    const cleanedJsonText = textResult.replace(/```json|```/g, "").trim();
    const translatedItems: { id: number; text: string }[] = JSON.parse(cleanedJsonText);

    // 5. Reinyección del texto traducido en el DOM mapeado
    translatedItems.forEach((item) => {
      const targetNode = textNodes.find(n => n.index === item.id);
      if (targetNode && targetNode.element) {
        // Reemplazamos el texto antiguo por el nuevo manteniendo el espacio/formato circundante
        targetNode.element.data = item.text;
      }
    });

    // 6. Retornar el HTML final completamente reconstruido
    // .html() nos devuelve el string limpio con las imágenes y clases de Next sin haber sido tocadas por la IA
    return $.html();

  } catch (error) {
    console.error("❌ [Cheerio/Gemini Error] Error procesando el HTML:", error);
    return rawHtml; // Fallback definitivo de seguridad para no romper la app
  }
}

}