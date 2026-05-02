import { GoogleGenerativeAI } from "@google/generative-ai";
import path from 'path';
import dotenv from 'dotenv';

interface Competitor {
  title: string;
  price: number;
  link?: string;
  source: string;
  isSynthetic: boolean;
}

export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  // Cambiamos a gemini-1.5-flash para velocidad en discovery o pro para análisis profundo
  private model = this.genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
    generationConfig: { 
      responseMimeType: "application/json",
      temperature: 0.7, // Balance entre creatividad y precisión
    } 
  });

  /**
   * Genera nichos basados en micro-tendencias y estacionalidad inversa (Hemisferio Norte/Sur)
   */
  async generateDynamicNiches(country: string): Promise<string[]> {
    const month = new Date().toLocaleString('es-CL', { month: 'long' });
    
    const prompt = `
      CONTEXTO: Actúa como un Analista de Inteligencia de Mercados especializado en Arbitraje Transfronterizo.
      OBJETIVO: Identificar 2 micro-nichos de alta velocidad para el mercado de ${country} en el mes de ${month}.

      PARÁMETROS DE SELECCIÓN:
      1. ESTACIONALIDAD ESTRATÉGICA: Considera el clima actual en ${country}. Si es invierno, busca confort térmico; si es verano, busca portabilidad y exterior.
      2. MIX DE PORTAFOLIO: 30% Estacionales, 40% Solución de Problemas (Problem-Solvers), 30% Estética/Tendencia Viral (TikTok-ready).
      3. RESTRICCIÓN COMERCIAL: Máximo 3 palabras por nicho, en INGLÉS técnico. Evita palabras genéricas (prohibido: "gadgets", "clothing", "electronics").
      4. FILTRO DE ESCALABILIDAD: Productos que tengan un "efecto WOW" visual pero que pesen menos de 1kg para optimizar el shipping internacional.

      FORMATO DE SALIDA: JSON array de strings exclusivamente.
      EJEMPLO: ["portable neck fan", "self-cleaning cat litter", "compression knee sleeve"]`;
    
    try {
      const result = await this.model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error("❌ Error en Discovery IA:", error);
      return ["innovative home tools", "travel comfort essentials", "smart fitness tech"];
    }
  }

  /**
   * Optimiza títulos de AliExpress para SEO con intención de compra
   */
  async translateForSearch(title: string, targetLang: string): Promise<string> {
    const prompt = `
      TAREA: Refactorizar títulos de productos para SEO de e-commerce.
      ORIGINAL: ${title}
      IDIOMA OBJETIVO: ${targetLang}
      
      REGLAS:
      1. Extrae el "Core Entity" del producto (ej: "Proyector", "Humidificador").
      2. Añade el beneficio principal o característica técnica clave.
      3. Máximo 4 palabras. Sin adjetivos vacíos ("amazing", "cheap"). Sin marcas.
      
      SALIDA: Solo el texto plano purificado.`;
    
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      return title.split(' ').slice(0, 3).join(' ');
    }
  }

  /**
   * Orquestador de Arbitraje: Análisis financiero y Copywriting Psicológico
   */
  // Agregamos landedCostUsd como 5to parámetro
async analyzeArbitrage(
  aliData: any, 
  competitors: Competitor[], 
  targetCountry: string, 
  taxRate: number,
  landedCostUsd: number // <--- Recibimos el costo con absorción de envío
) {
  // Buscamos si existe el marcador sintético en el array
  const hasSynthetic = competitors.some(c => c.isSynthetic);
  const minCompPrice = competitors.length > 0 ? Math.min(...competitors.map(c => c.price)) : 0;
  
  // Usamos el landedCostUsd que ya viene calculado con el envío local absorbido
  const prompt = `
    Actúa como un CFO y Director de Marketing de E-commerce. Evalúa la viabilidad financiera del producto: "${aliData.title}".

    DATA ECONÓMICA (INPUT):
    - Costo de Adquisición Total (Landing + Envío Local Absorbido): ${landedCostUsd.toFixed(2)} USD.
    - Competencia Local Mínima: ${minCompPrice || 'N/A'}.
    - Impuestos Aplicables (IVA/VAT): ${taxRate}%.
    - Comisión de Pasarela (Estimada): 5%.

    PROTOCOLO DE PRICING ESTRATÉGICO:
    1. ESCENARIO COMPETITIVO: Si hay competencia real (${!hasSynthetic}), el 'suggestedPriceLocal' debe posicionarse un 2% por debajo de ${minCompPrice} para capturar volumen.
    2. ESCENARIO DE EXCLUSIVIDAD: Si el competidor es "Aether-Market-Engine" (Sintético: ${hasSynthetic}), tienes un 'Océano Azul'. Optimiza para ROI de 100% a 250%.

    LÓGICA DE DECISIÓN (WINNER):
    - MARCAR COMO TRUE SOLO SI:
      - ROI Final > 30% tras impuestos y comisiones.
      - Margen Neto > $6 USD (Este es tu presupuesto de marketing).

    ... (Resto de las reglas de Copywriting) ...
  `;

  try {
    const result = await this.model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    
    // Devolvemos el objeto enriquecido
    return {
      ...parsed,
      landedCostUsd // Mantenemos la trazabilidad del costo
    };
  } catch (error) {
    return { isWinner: false, verdict: "Fallo en motor de análisis IA", suggestedPriceLocal: 0 };
  }
}
}