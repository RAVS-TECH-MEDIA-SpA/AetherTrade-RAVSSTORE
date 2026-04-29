import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { listenForCandidates } from './workers/analysis.worker.js'; 
import { runDiscoveryTask } from './workers/discovery.worker.js'; 

// 1. Manejo de Entorno Inteligente
if (process.env.NODE_ENV !== 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootEnvPath = path.resolve(__dirname, '../../../.env');
  dotenv.config({ path: rootEnvPath });
  console.log(`🏠 Entorno local detectado. Cargando .env desde: ${rootEnvPath}`);
}

const app = express();
// GCP inyecta el puerto en la variable PORT. Si no existe, usamos 8080.
const port = process.env.PORT || 8080;
const host = '0.0.0.0'; // DEBE SER ASÍ

/**
 * 2. Inicialización Silenciosa
 * No bloqueamos el arranque del servidor por los workers.
 * Cloud Run necesita que el puerto responda en < 10 segundos.
 */
const startWorkers = async () => {
  try {
    await listenForCandidates();
    console.log('📡 AnalysisWorker: Suscripción activa.');
  } catch (err) {
    console.error('❌ Error iniciando AnalysisWorker:', err);
    // En prod, quizás no quieres que el proceso muera, solo loguear.
  }
};

// 3. Rutas
app.get('/health', (req, res) => {
  // Reportamos que el proceso está vivo inmediatamente
  res.status(200).send('Worker AI Online');
});

app.post('/trigger-discovery', (req, res) => {
  console.log('🚀 Trigger manual recibido.');
  // Lo ejecutamos en background para no dejar colgada la petición HTTP
  runDiscoveryTask().catch(err => console.error('Error en Discovery:', err));
  res.status(202).send({ message: 'Discovery process started in background' });
});

/**
 * 4. El "Contrato de Cloud Run"
 * Escuchamos en '0.0.0.0' para que el tráfico externo pueda entrar al contenedor.
 */
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`🚀 Ravstore Engine operando en puerto ${port}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Iniciamos los workers después de que el puerto ya está abierto
  startWorkers();
});