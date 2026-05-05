import { Router } from 'express';
import { 
  getDashboardStats, 
  getInventory, 
  getProductById, 
  triggerAnalysis 
} from './controllers/dashboard.controller';

const router = Router();

/**
 * RUTAS DEL DASHBOARD & LANDING
 */

// Obtener estadísticas generales (Cards superiores)
router.get('/stats/summary', getDashboardStats);

// Obtener lista de productos para el inventario
router.get('/inventory', getInventory);

// FIX: Ruta para el modal de detalle (Solución al Error 405)
// Esta ruta permite que el frontend haga un GET /api/products/[UUID]
router.get('/products/:id', getProductById);

// Trigger manual para forzar análisis de un nicho
router.post('/analyze', triggerAnalysis);

export default router;