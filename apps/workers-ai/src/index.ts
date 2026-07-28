// apps/workers-ai/src/index.ts
import express from 'express';
import cors from 'cors'; // <-- IMPORTANTE
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

// --- CONFIGURACIÓN DE CORS (Ajuste para corregir el error de la captura) ---
app.use(cors({
  origin: '*', // Permite peticiones desde cualquier origen (Landing, Gateway, Localhost)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.use(express.json()); // Necesario para parsear el body

const port = process.env.PORT || 8081;

/**
 * 2. Inicialización Silenciosa
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

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`🚀 Ravstore Engine operando en puerto ${port}`);
  startWorkers();
});