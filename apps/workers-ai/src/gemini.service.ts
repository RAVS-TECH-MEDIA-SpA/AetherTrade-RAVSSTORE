import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private model = this.genAI.getGenerativeModel({ 
    model: "gemini-1.5-pro",
    generationConfig: { responseMimeType: "application/json" } 
  });

  async analyzeArbitrage(aliData: any, competitors: any[]) {
    const prompt = `
      Actúa como un experto en arbitraje de e-commerce europeo. 
      Analiza si el siguiente producto de AliExpress es un "Winner" comparándolo con los resultados de la competencia en Google.

      DATOS DE COMPRA (AliExpress):
      - Título: ${aliData.title}
      - Costo Producto: ${aliData.price} EUR
      - Costo Envío: ${aliData.shipping} EUR

      RESULTADOS DE COMPETENCIA (Google Search):
      ${JSON.stringify(competitors)}

      REGLAS DE CÁLCULO:
      1. Identifica el precio de venta promedio de los competidores que vendan EXACTAMENTE el mismo producto.
      2. Calcula el Margen Neto: (Precio Venta / 1.21) - (Costo Producto + Costo Envío) - 1.50 (Comisión Pago).
      *Nota: 1.21 es el IVA (VAT) estimado del 21% en España/Alemania.

      DEVUELVE UN JSON CON ESTA ESTRUCTURA:
      {
        "isWinner": boolean,
        "confidenceScore": number (0-1),
        "suggestedPrice": number,
        "netMargin": number,
        "analysis": "Breve explicación de por qué es o no un winner",
        "competitorMatch": "Título del competidor más cercano"
      }
    `;

    const result = await this.model.generateContent(prompt);
    return JSON.parse(result.response.text());
  }
}