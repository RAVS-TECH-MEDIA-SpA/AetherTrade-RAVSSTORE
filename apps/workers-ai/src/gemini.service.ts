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
  // Inicialización mediante Vertex AI (Usa automáticamente GOOGLE_APPLICATION_CREDENTIALS)
  private vertexAI = new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT || 'aethertrade-core',
    location: 'us-central1' // Región por defecto recomendada para Vertex AI
  });

  private model = this.vertexAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
    generationConfig: { 
      responseMimeType: "application/json",
      temperature: 0.8, 
    } 
  });

  /**
   * Traduce una lista de atributos técnicos al idioma destino en un solo bloque.
   */
  async translateAttributes(attributes: any[], targetLang: string): Promise<any[]> {
    const prompt = `Traduce esta lista técnica de productos al ${targetLang}. 
    Devuelve SOLO un array JSON: [{"name": "traducido", "value": "traducido"}].
    Lista: ${JSON.stringify(attributes)}`;
    
    const result = await this.model.generateContent(prompt);
    // Extraemos el texto de la respuesta (la API es compatible con la versión anterior)
    const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    return JSON.parse(textResult.replace(/```json|```/g, ""));
  }

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
      const result = await this.model.generateContent(prompt);
      const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return textResult.trim();
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
    
    // Extraemos la info para inyectar en el prompt (Limitado para no explotar tokens)
    const technicalSpecs = JSON.stringify(aliData.properties?.slice(0, 15) || []);
    const manufacturerDescription = aliData.extended_text ? aliData.extended_text.substring(0, 1500) : 'Sin descripción adicional.';

    const prompt = `
      Actúa como un CFO y Copywriter de tecnología High-End experto en E-commerce. 
      Tu misión es evaluar la viabilidad financiera y crear el material de venta premium para el producto: "${aliData.title}".

      ### 1. DATA ECONÓMICA (INPUT):
      - Costo de Adquisición Total: ${landedCostUsd.toFixed(2)} USD.
      - TIPO DE CAMBIO: 1 USD = ${rateToUsd} ${currency}.
      - Competencia Local Mínima detectada: ${minCompPriceLocal} ${currency}.
      - Impuestos Aplicables (IVA/VAT): ${taxRate}%.
      - Comisión de Pasarela de Pagos (Estimada): 5%.

      ### 2. DATA TÉCNICA DEL PRODUCTO (Para tu Copywriting):
      - Especificaciones: ${technicalSpecs}
      - Descripción del Fabricante: ${manufacturerDescription}

      ### 3. PROTOCOLO DE PRICING ESTRATÉGICO:
      - ESCENARIO COMPETITIVO: Si existe competencia real (${!hasSynthetic}), el 'suggestedPriceLocal' debe posicionarse un 4% por debajo del precio mínimo de la competencia para capturar volumen de mercado rápidamente.
      - ESCENARIO DE EXCLUSIVIDAD: Si el competidor es "Aether-Market-Engine" (Sintético: ${hasSynthetic}), estás ante un 'Océano Azul'. Optimiza el precio para obtener un ROI de entre el 100% y el 250% según la utilidad percibida.

      ### 4. LÓGICA DE DECISIÓN (WINNER):
      - MARCAR "isWinner" COMO TRUE SOLO SI:
        - El ROI Final es > 15% tras descontar impuestos y comisiones (Calcula convirtiendo el Costo USD a ${currency} usando el tipo de cambio ${rateToUsd}).
        - El Margen Neto es > $${config.SAFETY_MARGIN.toFixed(2)} USD.

      ### 5. REGLAS DE COPYWRITING PROFESIONAL (AIDA):
      - TÍTULO: Máximo 60 caracteres, en idioma ${targetCountry === 'CL' ? 'Español' : 'Inglés'}, enfocado en el beneficio principal y SEO.
      - HOOK: Una frase disruptiva que detenga el scroll.
      - BENEFICIOS: Lista de 3 a 4 puntos clave, extraídos estrictamente de la Data Técnica del Producto. Transforma características en beneficios de alto valor.
      - DESCRIPCIÓN: Un párrafo de 4 a 5 líneas, EXTREMADAMENTE DETALLADO y persuasivo, basado en la descripción del fabricante proporcionada. Usa lenguaje técnico, formal pero enfocado en el beneficio. Cero textos genéricos.

      ### 6. PROTOCOLO DE SALIDA (JSON ESTRICTO):
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
          "description_localized": "string"
        }
      }

      ANÁLISIS ESTRATÉGICO FINALIZADO. RESPONDE SOLO EL JSON:`;

    try {
      const result = await this.model.generateContent(prompt);
      const textResult = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const cleanJson = textResult.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      
      // Adaptación de nombres si Gemini usa description en lugar de description_localized
      if(parsed.copywriting && parsed.copywriting.description && !parsed.copywriting.description_localized) {
        parsed.copywriting.description_localized = parsed.copywriting.description;
      }

      return {
        ...parsed,
        landedCostUsd
      };
    } catch (error: any) {
      console.error("❌ Error parseando Gemini Arbitrage:", error.message || error);
      
      // ⚡ ESTA ES LA LÍNEA MÁGICA QUE FALTABA
      // Si el error dice 429 (Resource exhausted), lo disparamos hacia arriba 
      // para que el Worker (analysis.worker.ts) haga la pausa de 15s y reintente.
      if (error.message && error.message.includes('429')) {
        throw error; 
      }

      // Si es un error normal de formateo JSON, devolvemos un ganador fallido
      return { isWinner: false, analysis: { suggestedPriceLocal: 0, estimatedRoi: 0, netMarginUsd: 0 }, copywriting: {} };
    }
  }
}