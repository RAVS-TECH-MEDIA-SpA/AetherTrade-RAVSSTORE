import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private model = this.genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    generationConfig: { responseMimeType: "application/json" } 
  });

 

 async analyzeArbitrage(aliData: any, competitors: any[], targetCountry: string, taxRate: number) {
    const prompt = `
      Actúa como experto en E-commerce y Pricing Strategist para el mercado de ${targetCountry}.
      
      PRODUCTO ALI: ${aliData.title} | Costo: ${aliData.price} USD | Envío: ${aliData.shipping} USD
      COMPETENCIA: ${JSON.stringify(competitors)}

      REGLAS FISCALES Y DE NEGOCIO:
      1. IVA (Tax): ${taxRate}% (Ya incluido en el precio final de venta).
      2. Moneda de Destino: ${targetCountry === 'CL' ? 'CLP' : 'EUR'}.
      3. Comisión Pasarela: 1.50 USD fijos + 2.9%.
      
      OBJETIVO:
      - Calcula el Margen Neto: (Precio Venta / (1 + ${taxRate}/100)) - (Costo + Envío) - Comisiones.
      - Genera Marketing Copy en el idioma local de ${targetCountry} (Usa modismos locales si es necesario, ej. Chile vs España).
      
      DEVUELVE JSON:
      {
        "isWinner": boolean,
        "suggestedPriceLocal": number,
        "netMarginUsd": number,
        "roiPercent": number,
        "marketingCopy": {
          "headline": "Título persuasivo",
          "description": "Descripción larga con beneficios",
          "bullets": ["punto 1", "punto 2"]
        },
        "verdict": "Explicación técnica"
      }`;

    const result = await this.model.generateContent(prompt);
    return JSON.parse(result.response.text());
  }
}