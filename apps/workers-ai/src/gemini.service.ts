import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  async generateStrategy(productData: any, competitorPrices: any[], market: string) {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `Actúa como experto en e-commerce para el mercado de ${market}.
    Producto: ${JSON.stringify(productData)}
    Precios Competencia: ${JSON.stringify(competitorPrices)}
    
    Tarea: 
    1. Define el precio de venta óptimo (margen min 30%).
    2. Genera un título SEO y descripción persuasiva en el idioma local.
    3. Devuelve solo un JSON con: { suggestedPrice, currency, title, description, keywords }`;

    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  }
}