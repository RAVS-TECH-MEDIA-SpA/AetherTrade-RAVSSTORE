import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// En ESM (módulos), necesitamos reconstruir __dirname para rutas relativas seguras
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Subimos niveles: de src -> workers-ai -> apps -> raíz
const rootEnvPath = path.resolve(__dirname, '../../../.env');

const result = dotenv.config({ path: rootEnvPath });

// Log de diagnóstico Senior para estar 100% seguros
if (result.error) {
  console.error(`❌ No se encontró el .env en la raíz: ${rootEnvPath}`);
} else {
  console.log(`✅ .env de la raíz cargado correctamente`);
  console.log(`🔍 [DEBUG] Serper Key: ${process.env.SERPER_API_KEY ? 'Detectada' : 'Faltante en el archivo'}`);
}

import express from 'express';
// Mantener las extensiones .js es correcto si usas NodeNext/ESM
import { listenForCandidates } from './workers/analysis.worker.js'; 
import { runDiscoveryTask } from './workers/discovery.worker.js'; 

const app = express();
const port = process.env.PORT || 8080;

// Iniciamos el worker asíncrono para que escuche Pub/Sub
listenForCandidates().catch(console.error);

app.get('/health', (req, res) => res.send('Worker AI Online'));

app.post('/trigger-discovery', async (req, res) => {
  try {
    await runDiscoveryTask();
    res.send('Discovery triggered');
  } catch (error) {
    console.error('Error en trigger:', error);
    res.status(500).send('Error triggering discovery');
  }
});

app.listen(port, () => {
  console.log(`🚀 Workers-AI escuchando en puerto ${port}`);
});