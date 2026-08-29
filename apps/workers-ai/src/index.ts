import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Importación de Workers y Servicios
import { listenForCandidates } from './workers/analysis.worker.js'; 


import { runDiscoveryTask, triggerDiscoveryBatch, processPubSubNiche, processCJBatch, setupPubSubInits } from './workers/discovery.worker.js';

import { listenForMetaCapiEvents } from './workers/metaCapi.worker.js';
import './workers/stock-sync.worker.js';
import { startBillingWorker } from './workers/billing.worker.js';

import { syncCJStock } from './workers/cj-stock.worker.js';

if (process.env.NODE_ENV !== 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootEnvPath = path.resolve(__dirname, '../../../.env');
  dotenv.config({ path: rootEnvPath });
  console.log(`🏠 Entorno local detectado. Cargando .env desde: ${rootEnvPath}`);
}

const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-cron-secret'],
  credentials: true
}));

app.use(express.json()); 

const port = process.env.PORT || 8080;

const startWorkers = async () => {
  try {
    await listenForCandidates();
    console.log('📡 AnalysisWorker: Suscripción activa.');

    await listenForMetaCapiEvents();
    console.log('📡 MetaCapiWorker: Suscripción activa.');

    await startBillingWorker();
    console.log('🧾 BillingWorker: Suscripción activa.');
    await setupPubSubInits();
    console.log('📡 DiscoveryWorker: Suscripción de nichos activa.');
    console.log('📦 Endpoint AliExpress Batch: Listo en /crons/process-orders esperando a Cloud Scheduler.');

  } catch (err) {
    console.error('❌ Error iniciando los workers:', err);
  }
};

// Rutas de estado
app.get('/', (req, res) => res.status(200).send('Worker AI Root OK'));
app.get('/health', (req, res) => res.status(200).send('Worker AI Online'));

// ⚡ RUTA PARA CLOUD SCHEDULER (Procesamiento de Órdenes a CJ)
app.post('/crons/process-orders', processCJBatch);

// Agrega esta línea junto a las otras rutas de Cron Jobs
app.post('/crons/sync-stock', syncCJStock);

// Variables y Rutas de Análisis
let activeTasks = 0;
let isCircuitOpen = false; 

app.post('/analyze', async (req, res) => {
  const { niche, country, limit } = req.body;

  if (isCircuitOpen) {
    console.error("⛔ [CIRCUIT BREAKER] Petición rechazada.");
    return res.status(503).json({ message: "Análisis abortado: Cuota agotada.", status: "CIRCUIT_OPEN" });
  }

  const nichesArray = niche ? niche.split(/[;,]/).map((n: string) => n.trim()).filter((n: string) => n.length > 0) : [];

  if (nichesArray.length === 0) {
    console.log(`📡 Iniciando selección automática de la IA para ${country}.`);
    activeTasks++; 
    const autoBatchId = `AUTO-${Date.now()}`;
    
    runDiscoveryTask(autoBatchId, "IA_DYNAMIC_SELECTION", country, limit)
      .catch(err => {
        console.error(`🚨 Error en descubrimiento automático:`, err);
        if (err?.message?.includes('quota')) isCircuitOpen = true;
      })
      .finally(() => { activeTasks--; });

    return res.json({ message: "Análisis iniciado (Selección automática)", niches_processed: ["IA_DYNAMIC_SELECTION"], active_queue: activeTasks });
  }

  console.log(`📡 Iniciando análisis para ${nichesArray.length} nichos.`);
  const manualBatchId = `BATCH-${Date.now()}`;

  for (const singleNiche of nichesArray) {
    if (isCircuitOpen) break; 
    activeTasks++; 
    runDiscoveryTask(manualBatchId, singleNiche, country, limit)
      .catch(err => {
        console.error(`🚨 Error en nicho [${singleNiche}]:`, err);
        if (err?.message?.includes('quota')) isCircuitOpen = true;
      })
      .finally(() => { activeTasks--; });
  }

  return res.json({ message: "Análisis iniciado por lotes", niches_processed: nichesArray, active_queue: activeTasks });
});


// ... (configuración de express) ...

// 1. La ruta que debe llamar tu Cron en Google Cloud Scheduler
app.post('/api/cron/trigger-discovery', triggerDiscoveryBatch);

// 2. La NUEVA ruta oculta que recibe los Push de Pub/Sub
app.post('/api/pubsub/process-niche', processPubSubNiche);

// (Tu ruta de órdenes existente)
app.post('/api/cron/process-orders', processCJBatch);

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`🚀 RavsStore Engine operando en puerto ${port} (Satisfaciendo a Cloud Run)`);
  startWorkers();
});