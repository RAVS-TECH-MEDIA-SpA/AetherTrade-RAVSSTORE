import { MercadoPagoConfig, Preference } from 'mercadopago';

import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url'; // 👈 Añade esto

// 1. Recrear __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Configuración del path al .env global
// src (0) -> api-gateway (1) -> apps (2) -> AETHER-TRADE (3)
const envPath = path.resolve(__dirname, '../../../.env');

// 3. Carga de variables
dotenv.config({ path: envPath });

const client = new MercadoPagoConfig({ 
  accessToken: process.env.MP_ACCESS_TOKEN || '' 
});

export const createPreference = async (items: any[], orderId: string) => {
  const preference = new Preference(client);

  // Aseguramos que los datos sean primitivos limpios
  const itemsMP = items.map(item => ({
    id: String(item.id),
    title: String(item.title).slice(0, 250),
    quantity: Number(item.quantity),
    unit_price: Math.round(Number(item.price)),
    currency_id: 'CLP'
  }));

  try {
    const response = await preference.create({
      body: {
        items: itemsMP,
        metadata: {
          order_id: orderId
        },
        back_urls: {
          success: 'http://localhost:3000/checkout/success',
          failure: 'http://localhost:3000/checkout/failure',
          pending: 'http://localhost:3000/checkout/pending'
        },
        auto_return: "approved"
      }
    });

    console.log("✅ Preferencia creada con ID:", response.id);
    return response.id;
  } catch (error: any) {
    // Esto imprimirá en tu consola de VS Code el error REAL si MP rechaza algo
    console.error("❌ Error Mercado Pago Detalle:", error.message);
    if (error.cause) console.error("Causa:", JSON.stringify(error.cause, null, 2));
    throw error;
  }
};