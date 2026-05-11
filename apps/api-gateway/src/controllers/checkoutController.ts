import { Request, Response } from 'express';
import { createPreference } from '../services/checkoutService.js';

export const handleCheckout = async (req: Request, res: Response) => {
  try {
    const { items, orderId } = req.body;
    
    // 1. Aquí podrías guardar el pedido en tu DB con status "PENDIENTE"
    
    // 2. Generamos la URL de Mercado Pago
    const initPoint = await createPreference(items, orderId);
    
    res.json({ initPoint });
  } catch (error) {
    console.error("Error en checkout:", error);
    res.status(500).json({ error: "No se pudo generar el pago" });
  }
};