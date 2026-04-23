import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// 1. Reconstrucción de ruta para llegar a la raíz del monorepo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../../.env');

// 2. Cargamos el env si no existe ya (doble capa de seguridad)
if (!process.env.GEMINI_API_KEY) {
  dotenv.config({ path: rootEnvPath });
}

export class TrendService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log('\n--- [TrendService] Diagnóstico Gemini ---');
    if (apiKey) {
      console.log(`✅ API Key Detectada: ${apiKey.substring(0, 5)}...`);
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Usamos Flash para discovery: es más barato y rápido para listas simples
      this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    } else {
      console.error('❌ ERROR: GEMINI_API_KEY no encontrada.');
      console.info(`📂 Buscando en: ${rootEnvPath}`);
      throw new Error("No se pudo inicializar TrendService sin API Key.");
    }
    console.log('-------------------------------------------\n');
  }

  async getDynamicNiches(country: string): Promise<string[]> {
    const currentDate = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    
    // Adaptación geográfica: Chile (Verano/Otoño) vs Europa (Primavera/Verano)
    const marketContext = country === 'CL' 
      ? "mercado chileno (Chile), considerando la temporada actual en el hemisferio sur y festividades locales" 
      : "mercado europeo (España/Alemania), considerando la temporada en el hemisferio norte";

    const prompt = `
      Actúa como un experto Analista de Tendencias E-commerce. Hoy es ${currentDate}.
      Genera una lista de 8 nichos de productos de AliExpress con alto potencial de arbitraje para el ${marketContext}.
      
      REQUISITOS:
      1. Productos de ticket medio-bajo (< $50 USD).
      2. Alta demanda estacional o gadgets virales en TikTok/Instagram.
      3. Devuelve los términos de búsqueda en INGLÉS (para mejor compatibilidad con la API de Ali).
      4. Que los nichos sean de máximo 3 palabras.
      
      RESPONDE ÚNICAMENTE CON UN ARRAY JSON DE STRINGS:
      ["niche 1", "niche 2", ...]
    `;

    try {
      console.log(`🤖 Gemini generando nichos para: ${country}...`);
      const result = await this.model.generateContent(prompt);
      const response = await result.response.text();
      
      // Limpieza de Markdown si Gemini devuelve bloques de código
      const cleanJson = response.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (error: any) {
      console.error(`❌ Error generando nichos para ${country}:`, error.message);
      // Fallback robusto para no detener el worker
      return ['trending tech gadgets', 'home automation 2026', 'travel essentials'];
    }
  }
}