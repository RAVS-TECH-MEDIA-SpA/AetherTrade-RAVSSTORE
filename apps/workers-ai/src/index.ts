import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto'; // ⚡ FIX 1: Importamos crypto nativo para generar UUIDs reales

// Importación de Workers y Servicios adaptados al modelo Push
import { runDiscoveryTask, triggerDiscoveryBatch, processPubSubNiche, processCJBatch, setupPubSubInits } from './workers/discovery.worker.js';
import { syncCJStock } from './workers/cj-stock.worker.js';
import { syncCJTracking } from './workers/cj-tracking.worker.js';
// ⚡ NUEVA IMPORTACIÓN: El worker que procesa el análisis profundo de los candidatos
import { analyzeCandidatePush } from './workers/analysis.worker.js'; 

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
    // Inicializamos la infraestructura de tópicos y suscripciones Push de forma segura
    await setupPubSubInits();
    console.log('📡 Ecosistema Pub/Sub Push verificado correctamente.');
  } catch (err) {
    console.error('❌ Error inicializando el ecosistema:', err);
  }
};

// Rutas de estado
app.get('/', (req, res) => res.status(200).send('Worker AI Root OK'));
app.get('/health', (req, res) => res.status(200).send('Worker AI Online'));

// ⚡ RUTAS DE CRON JOBS Y WEBHOOKS PUSH
app.post('/crons/process-orders', processCJBatch);
app.post('/crons/sync-stock', syncCJStock);
app.post('/crons/sync-tracking', syncCJTracking);

app.post('/api/cron/trigger-discovery', triggerDiscoveryBatch);
app.post('/api/pubsub/process-niche', processPubSubNiche);
// ⚡ NUEVA RUTA: La que recibe los 50 finalistas de Pub/Sub para el análisis de IA
app.post('/api/pubsub/analyze-candidate', analyzeCandidatePush);

// Variables y Rutas de Análisis Manual / Legado
let activeTasks = 0;
let isCircuitOpen = false; 

app.post('/analyze', async (req, res) => {
  const { niche, country, limit } = req.body;

  if (isCircuitOpen) {
    console.error("⛔ [CIRCUIT BREAKER] Petición rechazada.");
    return res.status(503).json({ message: "Análisis abortado: Cuota agotada.", status: "CIRCUIT_OPEN" });
  }

  const nichesArray = niche ? niche.split(/[;,]/).map((n: string) => n.trim()).filter((n: string) => n.length > 0) : [];

  // ⚡ FIX 2: Evitamos el bucle de buscar literalmente "IA_DYNAMIC_SELECTION"
  if (nichesArray.length === 0) {
    console.warn(`⚠️ Intento de análisis sin nichos. Petición rechazada para evitar consultas fantasma en CJ.`);
    return res.status(400).json({ 
      error: "Falta el parámetro 'niche'. Para probar envíe un nicho. Para automatización IA use el endpoint /api/cron/trigger-discovery" 
    });
  }

  console.log(`📡 Iniciando análisis para ${nichesArray.length} nichos.`);
  
  // ⚡ FIX 3: Usamos un UUID válido para PostgreSQL en lugar de concatenar texto
  const manualBatchId = crypto.randomUUID();

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

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`🚀 RavsStore Engine operando en puerto ${port} (Modelo Push HTTP Activo)`);
  startWorkers();
});