import { Router } from 'express';
import { 
  getDashboardStats, 
  getInventory, 
  triggerAnalysis 
} from './controllers/dashboard.controller';

const router = Router();

/**
 * Endpoints del Dashboard
 */

// 1. Resumen de KPIs y Gráficos
router.get('/stats/summary', getDashboardStats);

// 2. Lista completa de productos
router.get('/inventory', getInventory);

// 3. Disparo de análisis masivo (el que configuramos con ';' y limit)
router.post('/analyze', triggerAnalysis);

export default router;