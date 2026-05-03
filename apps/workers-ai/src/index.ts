// apps/workers-ai/src/index.ts
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
app.use(express.json()); // Necesario para parsear el body de la API Gateway

// GCP inyecta el puerto en la variable PORT. Si no existe, usamos 8080.
const port = process.env.PORT || 8080;

/**
 * 2. Inicialización Silenciosa
 * Cloud Run necesita que el puerto responda rápido (< 10s).
 */
const startWorkers = async () => {
  try {
    await listenForCandidates();
    console.log('📡 AnalysisWorker: Suscripción activa.');
  } catch (err) {
    console.error('❌ Error iniciando AnalysisWorker:', err);
  }
};

// 3. Rutas

// Health Check para Cloud Run / Kubernetes
app.get('/health', (req, res) => {
  res.status(200).send('Worker AI Online');
});

/**
 * Endpoint para el Dashboard: Dispara un análisis específico
 * Se conecta con dashboard.controller.ts del API-Gateway
 */
app.post('/analyze', (req, res) => {
  const { niche, country } = req.body;
  console.log(`🚀 Solicitud de análisis recibida: Nicho [${niche}] en [${country}]`);
  
  // Ejecutamos en segundo plano para no bloquear el puerto 8080
  runDiscoveryTask(niche, country).catch(err => 
    console.error('🚨 Error en Discovery Task:', err)
  );

  res.status(202).send({ 
    message: 'Analysis initiated', 
    context: { niche, country } 
  });
});

// Trigger manual heredado del Ravstore Engine
// app.post('/trigger-discovery', (req, res) => {
//   console.log('🚀 Trigger manual recibido.');
//   runDiscoveryTask().catch(err => console.error('Error en Discovery:', err));
//   res.status(202).send({ message: 'Discovery process started in background' });
// });

/**
 * 4. Ejecución del Servidor
 * Escuchamos en '0.0.0.0' para visibilidad externa del contenedor.
 */
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`🚀 Ravstore Engine operando en puerto ${port}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  
  // Iniciamos los procesos de escucha después de abrir el puerto
  startWorkers();
});