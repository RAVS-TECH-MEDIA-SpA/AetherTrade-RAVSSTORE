import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargamos el .env desde la raíz del monorepo (3 niveles arriba)
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_API_HOST = 'aliexpress-datahub.p.rapidapi.com';

async function testRapidAPI() {
  console.log("🧪 Iniciando test de RapidAPI...");
  console.log("🔑 Ruta .env:", envPath);
  console.log("🔑 Key detectada:", RAPID_API_KEY ? `${RAPID_API_KEY.substring(0, 5)}...` : "NO ❌");

  if (!RAPID_API_KEY) {
    console.error("❌ Error: No se encontró RAPID_API_KEY en el archivo .env");
    return;
  }

  const options = {
    method: 'GET',
    url: `https://${RAPID_API_HOST}/item_search_3`,
    params: { q: 'iphone 15 case', page: '1' },
    headers: {
      'x-rapidapi-key': RAPID_API_KEY,
      'x-rapidapi-host': RAPID_API_HOST
    }
  };

  try {
    const response = await axios.request(options);
    
    if (response.data && response.data.result) {
      console.log("✅ Conexión Exitosa con RapidAPI!");
      console.log("📦 Muestra de datos recibidos:", response.data.result.resultList?.[0]?.item?.title || "Sin títulos");
      
      // Información de cuota (Muy útil para no quedar a ciegas)
      console.log("📊 Cuota Restante (X-RateLimit-Requests-Remaining):", response.headers['x-ratelimit-requests-remaining']);
      console.log("📅 Reset de Cuota:", response.headers['x-ratelimit-requests-reset']);
    } else {
      console.warn("⚠️ Respuesta inesperada de la API:", response.data);
    }
  } catch (error: any) {
    console.error("❌ Falló el test de RapidAPI:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Mensaje: ${error.response.data?.message || error.message}`);
    } else {
      console.error(`Error: ${error.message}`);
    }
  }
}

testRapidAPI();