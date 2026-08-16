import { Request, Response } from 'express';
import { CheckoutService } from '../services/checkoutService.js';

const checkoutService = new CheckoutService();

export const handleCheckout = async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
console.log("🚀 Recibido request de Checkout con orderData:", orderData);
    // Validación original mantenida
    if (!orderData.items || orderData.items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // ============================================================================
    // ⚡ EL PUENTE DE META CAPI: Capturamos la huella digital del cliente real
    // ============================================================================
    const trackingData = {
      // Priorizamos x-forwarded-for por si estás detrás de un balanceador de carga o proxy (como Cloud Run)
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '0.0.0.0',
      userAgent: req.headers['user-agent'] || '',
      // Capturamos cookies de Facebook si Express tiene cookie-parser, o desde el body como fallback
      fbc: req.cookies?._fbc || orderData.tracking?.fbc || null, 
      fbp: req.cookies?._fbp || orderData.tracking?.fbp || null  
    };
console.log("llamando a createPreference con orderData y trackingData:", orderData, trackingData);
    // ⚡ FIX: Le pasamos la orden Y la huella digital (trackingData)
    const result = await checkoutService.createPreference(orderData, trackingData);
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error('❌ Error en Controlador de Checkout:', error.message);
    res.status(500).json({ error: 'Error interno al procesar el pago' });
  }
};