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
// apps/workers-ai/src/index.ts

// apps/workers-ai/src/index.ts

// --- VARIABLES DE CONTROL GLOBAL ---
let activeTasks = 0;
let isCircuitOpen = false; // Si es true, la API está muerta y no enviamos más peticiones

app.post('/analyze', async (req, res) => {
  const { niche, country, limit } = req.body;

  // CIRCUIT BREAKER: Si el circuito está abierto, rechazamos la petición de inmediato
  if (isCircuitOpen) {
    console.error("⛔ [CIRCUIT BREAKER] Petición rechazada: La cuota de RapidAPI está agotada.");
    return res.status(503).json({ 
      message: "Análisis abortado: La API de AliExpress ha agotado sus créditos mensuales.",
      status: "CIRCUIT_OPEN"
    });
  }

  // 1. Procesar los nichos recibidos
  const nichesArray = niche 
    ? niche.split(/[;,]/).map((n: string) => n.trim()).filter((n: string) => n.length > 0)
    : [];

  // 2. CASO ESPECIAL: Búsqueda sin nichos fijos (IA Selection)
  if (nichesArray.length === 0) {
    console.log(`📡 No se recibieron nichos fijos. Iniciando selección automática de la IA para ${country}.`);
    
    activeTasks++; // Incrementamos el tracker de cola

    // Al pasar 'undefined' como nicho, tu función runDiscoveryTask 
    // usará el prompt de estacionalidad (mes/país) que configuramos antes.
    runDiscoveryTask(undefined, country, limit)
      .catch(err => {
        console.error(`🚨 Error en descubrimiento automático de IA:`, err);
        // DETECCIÓN DE QUOTA: Abrimos el circuito si el error menciona la cuota
        if (err?.message?.includes('quota') || err?.message?.includes('exceeded')) {
          isCircuitOpen = true;
          console.error("⛔ [CIRCUIT BREAKER] Abriendo circuito por cuota agotada.");
        }
      })
      .finally(() => {
        activeTasks--;
        console.log(`📉 Tarea finalizada (Auto). Quedan ${activeTasks} en cola.`);
        if (activeTasks === 0) {
          console.log("✅ [COLOSSAL CHECKPOINT] Todas las tareas de la cola han sido procesadas.");
        }
      });

    return res.json({ 
      message: "Análisis iniciado (Selección automática de la IA)", 
      niches_processed: ["IA_DYNAMIC_SELECTION"],
      active_queue: activeTasks
    });
  }

  // 3. CASO NORMAL: Iterar sobre nichos específicos
  console.log(`📡 Iniciando análisis para ${nichesArray.length} nichos distintos.`);

  for (const singleNiche of nichesArray) {
    // Si el circuito se abre en mitad de un bucle grande, dejamos de lanzar tareas
    if (isCircuitOpen) {
      console.warn(`🛑 Abortando lanzamiento de [${singleNiche}] por fallo de cuota previo.`);
      break; 
    }

    console.log(`🚀 Lanzando Discovery Task para: [${singleNiche}]`);
    
    activeTasks++; // Incrementamos el tracker de cola

    runDiscoveryTask(singleNiche, country, limit)
      .catch(err => {
        console.error(`🚨 Error en nicho [${singleNiche}]:`, err);
        // DETECCIÓN DE QUOTA: Abrimos el circuito si el error menciona la cuota
        if (err?.message?.includes('quota') || err?.message?.includes('exceeded')) {
          isCircuitOpen = true;
          console.error("⛔ [CIRCUIT BREAKER] Abriendo circuito por cuota agotada.");
        }
      })
      .finally(() => {
        activeTasks--;
        console.log(`📉 Tarea finalizada [${singleNiche}]. Quedan ${activeTasks} en cola.`);
        if (activeTasks === 0) {
          console.log("✅ [COLOSSAL CHECKPOINT] Todas las tareas de la cola han sido procesadas.");
        }
      });
  }

  return res.json({ 
    message: "Análisis iniciado por lotes", 
    niches_processed: nichesArray,
    active_queue: activeTasks
  });
});

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