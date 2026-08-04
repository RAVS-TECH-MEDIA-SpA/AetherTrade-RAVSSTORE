import { Request, Response } from 'express';
import { CheckoutService } from '../services/checkoutService.js';

const checkoutService = new CheckoutService();

export const handleCheckout = async (req: Request, res: Response) => {
  try {
    const orderData = req.body;

    if (!orderData.items || orderData.items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const result = await checkoutService.createPreference(orderData);
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error('❌ Error en Controlador de Checkout:', error.message);
    res.status(500).json({ error: 'Error interno al procesar el pago' });
  }
};