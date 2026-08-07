// apps/workers-ai/src/index.ts
import express from 'express';
import cors from 'cors'; // <-- IMPORTANTE
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { listenForCandidates } from './workers/analysis.worker.js'; 
import { runDiscoveryTask } from './workers/discovery.worker.js'; 
// ⚡ NUEVO: Importamos el Worker CAPI y el Cron de Stock de AutoDS
import { listenForMetaCapiEvents } from './workers/metaCapi.worker.js';
import './workers/stock-sync.worker.js';

// 1. Manejo de Entorno Inteligente
if (process.env.NODE_ENV !== 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootEnvPath = path.resolve(__dirname, '../../../.env');
  dotenv.config({ path: rootEnvPath });
  console.log(`🏠 Entorno local detectado. Cargando .env desde: ${rootEnvPath}`);
}

const app = express();

// --- CONFIGURACIÓN DE CORS (Ajuste para corregir el error de la captura) ---
app.use(cors({
  origin: '*', // Permite peticiones desde cualquier origen (Landing, Gateway, Localhost)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json()); // Necesario para parsear el body

// ⚡ FIX CLOUD RUN: Aseguramos que el fallback sea 8080
const port = process.env.PORT || 8080;

/**
 * 2. Inicialización Silenciosa
 */
const startWorkers = async () => {
  try {
    // Levantamos el Worker de Análisis de Productos
    await listenForCandidates();
    console.log('📡 AnalysisWorker: Suscripción activa.');

    // ⚡ NUEVO: Levantamos el Worker de Meta CAPI
    await listenForMetaCapiEvents();
    console.log('📡 MetaCapiWorker: Suscripción activa.');
  } catch (err) {
    console.error('❌ Error iniciando los workers:', err);
  }
};

// 3. Rutas

// ⚡ CLOUD RUN HEALTH CHECK: Agregamos el root por si GCP hace ping aquí
app.get('/', (req, res) => {
  res.status(200).send('Worker AI Root OK');
});

app.get('/health', (req, res) => {
  res.status(200).send('Worker AI Online');
});

// --- VARIABLES DE CONTROL GLOBAL ---
let activeTasks = 0;
let isCircuitOpen = false; 

app.post('/analyze', async (req, res) => {
  const { niche, country, limit } = req.body;

  if (isCircuitOpen) {
    console.error("⛔ [CIRCUIT BREAKER] Petición rechazada.");
    return res.status(503).json({ 
      message: "Análisis abortado: Cuota agotada.",
      status: "CIRCUIT_OPEN"
    });
  }

  const nichesArray = niche 
    ? niche.split(/[;,]/).map((n: string) => n.trim()).filter((n: string) => n.length > 0)
    : [];

  // 2. CASO ESPECIAL: Búsqueda sin nichos fijos (IA Selection)
  if (nichesArray.length === 0) {
    console.log(`📡 Iniciando selección automática de la IA para ${country}.`);
    activeTasks++; 

    // FIX TS2345: La función espera un string para batchId. No puede ser undefined.
    const autoBatchId = `AUTO-${Date.now()}`;
    
    // Firma correcta: (batchId, niche, manualCountry, eliteLimit)
    runDiscoveryTask(autoBatchId, "IA_DYNAMIC_SELECTION", country, limit)
      .catch(err => {
        console.error(`🚨 Error en descubrimiento automático:`, err);
        if (err?.message?.includes('quota')) isCircuitOpen = true;
      })
      .finally(() => {
        activeTasks--;
      });

    return res.json({ 
      message: "Análisis iniciado (Selección automática)", 
      niches_processed: ["IA_DYNAMIC_SELECTION"],
      active_queue: activeTasks
    });
  }

  // 3. CASO NORMAL: Nichos específicos
  console.log(`📡 Iniciando análisis para ${nichesArray.length} nichos.`);
  const manualBatchId = `BATCH-${Date.now()}`;

  for (const singleNiche of nichesArray) {
    if (isCircuitOpen) break; 
    
    activeTasks++; 
    // Firma correcta: (batchId, niche, manualCountry, eliteLimit)
    runDiscoveryTask(manualBatchId, singleNiche, country, limit)
      .catch(err => {
        console.error(`🚨 Error en nicho [${singleNiche}]:`, err);
        if (err?.message?.includes('quota')) isCircuitOpen = true;
      })
      .finally(() => {
        activeTasks--;
      });
  }

  return res.json({ 
    message: "Análisis iniciado por lotes", 
    niches_processed: nichesArray,
    active_queue: activeTasks
  });
});

// ⚡ FIX CLOUD RUN: 0.0.0.0 es crítico para que Google pueda inyectar el tráfico
app.listen(Number(port), '0.0.0.0', () => {
  console.log(`🚀 Ravstore Engine operando en puerto ${port} (Satisfaciendo a Cloud Run)`);
  startWorkers();
});