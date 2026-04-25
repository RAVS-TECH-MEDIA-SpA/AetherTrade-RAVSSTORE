// apps/workers-ai/src/test-gemini.ts
import { GeminiService } from './gemini.service.js';
// apps/workers-ai/src/test-gemini.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ajuste de ruta: src -> workers-ai -> apps -> raíz (3 niveles)
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

// DEBUG: Si esto sale 'undefined', el worker nunca verá la llave
console.log("🔑 Ruta buscada:", envPath);
console.log("🔑 API Key detectada:", process.env.GEMINI_API_KEY ? "SI ✅" : "NO ❌");

const gemini = new GeminiService();

const dummyProduct = {
  title: "Lentes de Ciclismo Polarizados Kapvoe",
  price: 15.50,
  shipping: 2.0,
  stock: 100
};

const dummyCompetitors = [
  { title: "Lentes Pro Chile", price: 45000 }, // Precio en CLP
  { title: "Amazon US Glasses", price: 35 }
];

async function test() {
  console.log("🧪 Probando prompt de Gemini...");
  const res = await gemini.analyzeArbitrage(dummyProduct, dummyCompetitors, 'CL', 19.0);
  console.log("🤖 Respuesta de la IA:", JSON.stringify(res, null, 2));
}

test();