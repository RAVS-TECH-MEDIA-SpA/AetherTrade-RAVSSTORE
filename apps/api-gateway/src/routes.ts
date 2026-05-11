import { Router } from 'express';
import { 
  getDashboardStats, 
  getInventory, 
  getProductById, 
  updateProduct,
  triggerAnalysis 
} from './controllers/dashboard.controller.js';
import { handleCheckout } from './controllers/checkoutController.js';
import { handleMPWebhook } from './webhooks/webhook.controller.js';


const router = Router();

/**
 * RUTAS DEL DASHBOARD & LANDING
 */

// Obtener estadísticas generales (Cards superiores - KPIs Glosario)
router.get('/stats/summary', getDashboardStats);

// Obtener lista de productos para el inventario (Incluye Joins Fiscales)
router.get('/inventory', getInventory);

// Detalle individual y Actualización del Master Editor
// Se utiliza /inventory/:id para coincidir con la llamada del frontend y evitar Error 404
router.get('/inventory/:id', getProductById);
router.put('/inventory/:id', updateProduct); // <-- SOLUCIÓN AL ERROR 404 DEL PUT

// Ruta alternativa para productos (Mantenida por compatibilidad si es necesario)
router.get('/products/:id', getProductById);

// Trigger manual para forzar análisis de un nicho vía Pub/Sub
router.post('/analyze', triggerAnalysis);

router.post('/checkout', handleCheckout);

router.post('/webhooks/mercadopago', handleMPWebhook);

export default router;