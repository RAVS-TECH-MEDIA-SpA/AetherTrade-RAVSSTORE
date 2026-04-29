import { GoogleGenerativeAI } from "@google/generative-ai";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private model = this.genAI.getGenerativeModel({ 
    model: "gemini-2.5-pro", 
    generationConfig: { responseMimeType: "application/json" } 
  });

  async generateDynamicNiches(country: string): Promise<string[]> {
    await sleep(4000); 

    const month = new Date().toLocaleString('es-CL', { month: 'long' });
    
    // PROMPT BLINDADO: Clima local, pero búsqueda en INGLÉS corto.
   const prompt = `Actúa como experto en Dropshipping y analista de mercado. Estamos en el mes de ${month} y el mercado objetivo es ${country}. 
    
    REGLAS ESTRATÉGICAS:
    1. BALANCE DE CATEGORÍAS: Identifica el clima actual en ${country} durante ${month}, pero NO te limites solo a productos estacionales. Tu lista de 15 nichos debe ser un mix estratégico que incluya: artículos estacionales, productos tecnológicos/smart home innovadores, y productos virales de estilo de vida o cuidado personal.
    2. FORMATO ESTRICTO (CRÍTICO): Los nichos DEBEN generarse EXCLUSIVAMENTE EN INGLÉS y tener MÁXIMO 3 PALABRAS (ej: "portable space heater", "smart posture corrector", "led desk lamp"). La API de búsqueda fallará si usas español o frases largas.
    3. ALTA DEMANDA / BAJA COMPETENCIA: Enfócate en sub-nichos específicos que muestren tendencia alcista actual en Google Trends o TikTok. Evita mercados hiper-saturados o genéricos (prohibido usar "clothing", "smartphones", "shoes", "gadgets").
    
    Genera la lista de 5 nichos de productos de AliExpress con alto potencial de venta.
    Responde SOLO un JSON array de strings, sin bloques de código, sin markdown ni explicaciones adicionales: ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]`;
    
    try {
      const result = await this.model.generateContent(prompt);
      let rawText = result.response.text();
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(rawText);
    } catch (error) {
      console.error("❌ Error generando nichos:", error);
      return ["smart home", "car accessories", "kitchen gadgets"]; 
    }
  }

  async translateForSearch(title: string, targetLang: string): Promise<string> {
    if (!title) return "producto";
    
    await sleep(4000); 

    const prompt = `Convierte este título de AliExpress en una búsqueda comercial de máximo 3 palabras para Google ${targetLang}. 
    PRODUCTO: ${title}. 
    REGLAS: Sin acentos, sin marcas chinas. Ejemplo: Magcubic Projector HY300 Android -> Proyector LED portatil.
    Responde SOLO el texto plano.`;
    
    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text().replace(/[^a-zA-Z0-9 ]/g, '').trim();
    } catch (error) {
      return title.split(' ').slice(0, 3).join(' ');
    }
  }

  async analyzeArbitrage(aliData: any, competitors: any[], targetCountry: string, taxRate: number) {
    await sleep(4000); 

    const minCompetitorPrice = competitors.length > 0 ? Math.min(...competitors.map(c => c.price)) : 0;
    
    const prompt = `Actúa como experto en Pricing Estratégico y Copywriting para E-commerce. Tu misión es determinar si un producto es un "Winner" para ${targetCountry}.

    DATOS TÉCNICOS:
    - PRODUCTO ORIGINAL: ${aliData.title}
    - COSTO ALI (Producto + Envío): ${(aliData.price + aliData.shipping).toFixed(2)} USD
    - PRECIO MÍNIMO COMPETENCIA LOCAL: ${minCompetitorPrice}
    - IVA: ${taxRate}%

    REGLAS DE ORO DE PRECIOS:
    1. ANCLA: Si hay competencia, el 'suggestedPriceLocal' DEBE ser igual o un 2% menor que el competidor más barato (${minCompetitorPrice}). Si no hay, usa un markup realista sobre el costo.
    2. MARGEN MÍNIMO: Si para ser competitivo el margen neto cae por debajo de $5 USD (después de IVA y costos), marca 'isWinner: false'.

    INSTRUCCIONES DE MARKETING:
    Debes generar un copy EXTENSO, detallado y persuasivo. Prohibido usar frases genéricas.
    - 'localizedProductName': Nombre comercial real.
    - 'headline': Título publicitario potente incluye.
    - 'description': Mínimo 2 párrafos persuasivos centrados en solucionar el dolor del cliente.
    - 'bullets': 3 a 5 puntos clave de venta con especificaciones reales.
    - 'english_content': Traducción precisa para mercados internacionales.

    RESPONDE JSON: {
      "isWinner": boolean,
      "suggestedPriceLocal": number,
      "netMarginUsd": number,
      "roiPercent": number,
      "verdict": "Explicación técnica detallada del análisis financiero",
      "marketingCopy": { 
        "localizedProductName": "string",
        "headline": "string", 
        "description": "string", 
        "bullets": ["string", "string", "string"],
        "english_content": {
          "title": "string",
          "description": "string"
        }
      }
    }`;
    
    try {
      const result = await this.model.generateContent(prompt);
      let rawText = result.response.text();
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      return JSON.parse(rawText);
    } catch (error) {
      console.error("Error IA Arbitraje:", error);
      return { isWinner: false, verdict: "Error IA", suggestedPriceLocal: 0 };
    }
  }
}