import dotenv from 'dotenv';
import path from 'path';
import { ScraperService } from './src/services/scraper.service';

// Esto busca el .env subiendo dos niveles desde apps/workers-ai/
// dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Log de seguridad para confirmar que dotenv despertó
console.log('--- [Debug] Carga de Entorno ---');
// console.log('Archivo buscado en:', path.resolve(__dirname, '../../.env'));
console.log('Variable detectada:', process.env.GOOGLE_SEARCH_API_KEY ? 'SÍ' : 'NO');
console.log('Variable detectada CX:', process.env.GOOGLE_SEARCH_CX ? 'SÍ' : 'NO');

console.log('-------------------------------\n');

async function testScraper() {
  const scraper = new ScraperService();
  
  // Usamos un término más específico para validar el scraper
  const product = "Baseus 65W GaN Charger";
  
  console.log(`\n🚀 Iniciando test de Scraper para: "${product}"...`);
  console.log(`---------------------------------------------------`);

  try {
    const prices = await scraper.getCompetitorPrices(product);
    
    // Log formateado (con 2 espacios de indentación) para lectura humana
    console.log('🔍 Payload recibido de la API:');
    console.log(JSON.stringify(prices, null, 2));

    if (!prices || prices.length === 0) {
      console.log("\n⚠️ La API respondió OK, pero el buscador (CX) no encontró resultados en los sitios permitidos.");
      return;
    }

    console.log("\n✅ Resultados encontrados exitosamente:");
    prices.forEach((res: any, i: number) => {
      console.log(`${i + 1}. [${res.priceHint}€] - ${res.title}`);
      console.log(`   🔗 ${res.link}\n`);
    });

  } catch (error: any) {
    console.error('\n💀 ERROR CRÍTICO EN EL SCRAPER:');
    
    if (error.response) {
      // El servidor respondió con un status fuera del rango 2xx
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // La petición se hizo pero no hubo respuesta
      console.error('No se recibió respuesta del servidor de Google. Revisa tu conexión.');
    } else {
      // Error al configurar la petición
      console.error('Error de configuración:', error.message);
    }
    
    process.exit(1); // Forzamos la salida con error para el CI/CD o terminal
  }
}

testScraper();