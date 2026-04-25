import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  // Usamos el modelo más eficiente para el Free Tier
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private model = this.genAI.getGenerativeModel({ 
    model: "gemini-3-flash-preview",
    generationConfig: { responseMimeType: "application/json" } 
  });

  async analyzeArbitrage(aliData: any, competitors: any[], targetCountry: string, taxRate: number) {
    const prompt = `
      Actúa como experto en E-commerce para el mercado de ${targetCountry}.
      
      PRODUCTO: ${aliData.title}
      COSTO: ${aliData.price} USD | ENVÍO: ${aliData.shipping} USD
      COMPETENCIA: ${JSON.stringify(competitors)}

      REGLAS:
      1. IVA: ${taxRate}% (Ya incluido en PVP final).
      2. COMISIÓN PASARELA: 2.9% + 0.30 USD.
      3. MARGEN NETO: (PVP / (1 + ${taxRate}/100)) - (Costo + Envío) - Comisiones.

      OBJETIVO:
      - Determina si es un Winner (Margen Neto > 20%).
      - Genera Marketing Copy persuasivo en el idioma de ${targetCountry}.
      
      RESPONDE SOLO JSON:
      {
        "isWinner": boolean,
        "suggestedPriceLocal": number,
        "netMarginUsd": number,
        "roiPercent": number,
        "marketingCopy": {
          "headline": "título",
          "description": "beneficios",
          "bullets": ["punto 1", "punto 2"]
        },
        "verdict": "explicación breve"
      }`;

    try {
      const result = await this.model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error("❌ Error parseando respuesta de Gemini:", error);
      throw error;
    }
  }
}