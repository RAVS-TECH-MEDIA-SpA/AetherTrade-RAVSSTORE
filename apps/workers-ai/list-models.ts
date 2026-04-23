import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Reconstruimos la ruta en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Subimos 2 niveles: de apps/workers-ai -> apps -> raíz
const rootEnvPath = path.resolve(__dirname, '../../.env');

// Cargamos manualmente
const result = dotenv.config({ path: rootEnvPath });

async function listAvailableModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log(`📂 Buscando .env en: ${rootEnvPath}`);

  if (result.error || !apiKey) {
    console.error("❌ No se detectó la API Key.");
    console.error("💡 Asegúrate de que el .env esté en la raíz y tenga GEMINI_API_KEY");
    return;
  }

  try {
    console.log("🔍 Consultando modelos para tu llave...");
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    const data: any = await response.json();

    if (data.models) {
      const chatModels = data.models.filter((m: any) => 
        m.supportedGenerationMethods.includes("generateContent")
      );

      console.log("\n✅ MODELOS DISPONIBLES:");
      console.table(chatModels.map((m: any) => ({
        ID: m.name.replace('models/', ''),
        Nombre: m.displayName
      })));
    } else {
      console.error("⚠️ Error en la respuesta de Google:", data.error?.message || "Desconocido");
    }
  } catch (error) {
    console.error("❌ Error de conexión:", error);
  }
}

listAvailableModels();