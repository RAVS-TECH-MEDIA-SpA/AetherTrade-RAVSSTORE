import { Request, Response } from 'express';

export const handleMPWebhook = async (req: Request, res: Response) => {
  const { query } = req;
  
  // Mercado Pago envía un ID de pago cuando algo sucede
  const topic = query.topic || query.type;

  if (topic === "payment") {
    const paymentId = query.id || query['data.id'];
    
    // 1. Consultar el estado del pago usando el paymentId en la API de Mercado Pago
    // 2. Si el status es 'approved', buscar el orderId en los metadatos
    // 3. Actualizar tu base de datos: UPDATE orders SET status = 'PAID' WHERE id = orderId
    
    console.log(`Pago recibido: ${paymentId}`);
  }

  // Siempre responder 200 a Mercado Pago para que no reintente
  res.sendStatus(200);
};