// apps/api-gateway/src/routes.ts
import { Router } from 'express';
import { handleMercadoPagoWebhook } from './webhooks/webhook.controller';
import { getDashboardStats, getInventory, triggerAnalysis } from './controllers/dashboard.controller';

const router = Router();

// Webhooks de Pago
router.post('/webhooks/mercadopago', handleMercadoPagoWebhook);

// Dashboard e Inventario
router.get('/stats/summary', getDashboardStats);
router.get('/inventory', getInventory);

// Motor de IA
router.post('/analysis/trigger', triggerAnalysis);

export default router;