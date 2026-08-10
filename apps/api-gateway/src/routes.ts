import { Router } from 'express';
import { 
  getDashboardStats, 
  getInventory, 
  getProductById, 
  updateProduct,
  triggerAnalysis,
  searchProductsHandler // <-- NUEVA IMPORTACIÓN
} from './controllers/dashboard.controller.js';
import { handleCheckout } from './controllers/checkoutController.js';
import { handleMPWebhook } from './webhooks/webhook.controller.js';
import { createOrder } from './controllers/orders.controller.js'; 
import { generateFacebookFeed } from './controllers/feed.controller.js';

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
router.put('/inventory/:id', updateProduct); 

// Ruta alternativa para productos (Mantenida por compatibilidad si es necesario)
router.get('/products/:id', getProductById);

// ⚡ NUEVA RUTA PARA EL BUSCADOR PREDICTIVO DEL NAVBAR ⚡
router.get('/search', searchProductsHandler);

// Trigger manual para forzar análisis de un nicho vía Pub/Sub
router.post('/analyze', triggerAnalysis);

// Ruta para guardar la orden antes del pago
router.post('/orders', createOrder);

router.post('/checkout', handleCheckout);

router.post('/webhooks/mercadopago', handleMPWebhook);

// Endpoint para el Catálogo de Commerce Manager de Meta
router.get('/feed/facebook.xml', generateFacebookFeed);

export default router;