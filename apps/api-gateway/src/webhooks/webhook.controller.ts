// apps/api-gateway/src/webhooks/webhook.controller.ts
import { Request, Response } from 'express';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { pool } from '../database'; // <--- CORREGIDO: Apuntando a src/database.ts

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export const handleMercadoPagoWebhook = async (req: Request, res: Response) => {
  const { query } = req;
  const topic = (query.topic || query.type) as string;

  if (topic !== 'payment') {
    return res.status(200).send('OK');
  }

  try {
    const paymentId = query.id || query['data.id'];
    
    if (!paymentId) return res.status(400).send('No payment ID');

    const payment = new Payment(client);
    
    // 2. Obtener detalles reales
    const paymentData = await payment.get({ id: paymentId.toString() });

    if (paymentData.status === 'approved') {
      const productId = paymentData.external_reference;
      const quantity = paymentData.additional_info?.items?.[0]?.quantity || 1;
      const amountLocal = paymentData.transaction_amount || 0;
      const currency = paymentData.currency_id || 'CLP';

      // 3. Obtener producto y tasa de cambio
      const productRes = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
      const product = productRes.rows[0];

      const rateRes = await pool.query('SELECT rate_to_usd FROM exchange_rates WHERE currency_code = $1', [currency]);
      
      // Fix para el error rojo de la Imagen 3:
      const rate = rateRes.rows.length > 0 ? parseFloat(rateRes.rows[0].rate_to_usd) : 1;

      if (product) {
        const amountUsd = amountLocal / rate;
        const baseCostTotalUsd = parseFloat(product.base_cost_usd) * Number(quantity);
        const shippingAbsorbedUsd = parseFloat(product.shipping_cost_usd || '0');
        
        const gatewayFeeUsd = amountUsd * 0.045; 
        const netProfitUsd = amountUsd - baseCostTotalUsd - shippingAbsorbedUsd - gatewayFeeUsd;

        await pool.query(`
          INSERT INTO sales_performance (
            product_id, quantity, amount_usd, shipping_cost_usd, 
            gateway_fee_usd, net_profit_usd, country_code
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [productId, quantity, amountUsd, shippingAbsorbedUsd, gatewayFeeUsd, netProfitUsd, product.target_country]);

        console.log(`✅ Venta en ${product.target_country} registrada.`);
      }
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('🚨 Error en Webhook:', error.message);
    res.status(500).send('Error');
  }
};