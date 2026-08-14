import { MercadoPagoConfig, Preference } from 'mercadopago';
import { pool } from '../database.js'; // ⚡ Importamos tu conexión a BD
import { randomUUID } from 'crypto';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });

export class CheckoutService {

  // ⚡ Agregamos trackingData para recibir IP, User-Agent, fbc y fbp desde el controller
  async createPreference(orderData: any, trackingData: any = {}) {
    const dbClient = await pool.connect();
    
    try {
      await dbClient.query('BEGIN'); // Iniciamos transacción

      const generatedOrderId = randomUUID(); 
      const totalAmount = orderData.items.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);

      // ⚡ LECTURA DE URL PARA EL RETORNO AL FRONTEND
      const rawUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const frontendUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

      // 1. Crear Preferencia en Mercado Pago
      const preference = new Preference(client);
      const mpItems = orderData.items.map((item: any) => ({
        id: String(item.productId || item.product_id || item.id), // Compatibilidad universal
        title: String(item.title).substring(0, 250),
        unit_price: parseInt(String(item.price), 10), 
        quantity: parseInt(String(item.quantity), 10),
        currency_id: 'CLP'
      }));

      const mpResponse = await preference.create({
        body: {
          items: mpItems,
          payer: {
            email: orderData.customer.email,
            name: orderData.customer.firstName,
            surname: orderData.customer.lastName,
          },
          external_reference: generatedOrderId,
          back_urls: {
            success: `${frontendUrl}/checkout/success`, 
            failure: `${frontendUrl}/checkout`,
            pending: `${frontendUrl}/checkout`
          },
          auto_return: "approved",
          notification_url: `${process.env.API_GATEWAY_URL}/api/webhooks/mercadopago`,
        }
      });

      // 2. Gestionar el Cliente (Upsert en tabla 'customers')
      const upsertCustomerQuery = `
        INSERT INTO customers (email, first_name, last_name, phone, is_guest)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (email) DO UPDATE 
        SET first_name = EXCLUDED.first_name, 
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone
        RETURNING id;
      `;
      const customerResult = await dbClient.query(upsertCustomerQuery, [
        orderData.customer.email,
        orderData.customer.firstName,
        orderData.customer.lastName,
        orderData.customer.phone || null
      ]);
      const customerId = customerResult.rows[0].id;

      // 3. Crear la Orden (⚡ FIX: USD en 0 y Guardamos la data del Meta Pixel)
      const insertOrderQuery = `
        INSERT INTO orders (id, customer_id, mp_preference_id, status, total_amount_local, total_amount_usd, client_tracking_data)
        VALUES ($1, $2, $3, 'PENDING_PAYMENT', $4, 0, $5)
      `;
      await dbClient.query(insertOrderQuery, [
        generatedOrderId, 
        customerId,
        mpResponse.id, 
        totalAmount,
        trackingData
      ]);

      // ============================================================================
      // ⚡ 4. EL CRUCE INTELIGENTE DE IDs Y VARIANTES
      // ============================================================================
      for (const item of orderData.items) {
        let incomingId = String(item.productId || item.product_id || item.id).trim();
        let variantId = item.variantId || item.variant_id ? String(item.variantId || item.variant_id).trim() : null;
        
        // Limpiamos strings de nulos de JavaScript
        if (variantId === 'undefined' || variantId === 'null') variantId = null;

        // Si el front nos mandó un ID compuesto (ej: 1005007551-120000412), lo separamos
        if (incomingId.includes('-') && !incomingId.match(/^[0-9a-fA-F-]{36}$/)) {
          incomingId = incomingId.split('-')[0];
        }

        let realProductId = null;
        
        // Expresión regular estándar para detectar UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incomingId);

        if (isUUID) {
          // Si es UUID, buscamos por la columna 'id'
          const search = await dbClient.query('SELECT id FROM products WHERE id = $1 LIMIT 1', [incomingId]);
          if (search.rows.length > 0) {
            realProductId = search.rows[0].id;
          } else {
            throw new Error(`El producto con UUID ${incomingId} no existe en la base de datos.`);
          }
        } else {
          // Si es un número (AliExpress ID), buscamos por 'aliexpress_id'
          const search = await dbClient.query('SELECT id FROM products WHERE aliexpress_id = $1 LIMIT 1', [incomingId]);
          if (search.rows.length > 0) {
            realProductId = search.rows[0].id;
          } else {
            throw new Error(`Producto con AliExpress ID ${incomingId} no encontrado en la base de datos local.`);
          }
        }

        // ⚡ FIX: Insertamos variant_id, y seteamos unit_cost_usd en 0 para proteger las finanzas
        await dbClient.query(`
          INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price_local, unit_cost_usd)
          VALUES ($1, $2, $3, $4, $5, 0)
        `, [
          generatedOrderId,
          realProductId,
          variantId,
          item.quantity,
          item.price
        ]);
      }

     await dbClient.query('COMMIT'); 
      // ⚡ Devolvemos el init_point para que la Landing redirija al cliente
      return { 
        preferenceId: mpResponse.id, 
        init_point: mpResponse.init_point 
      };

    } catch (error: any) {
      await dbClient.query('ROLLBACK'); 
      console.error('❌ Error en CheckoutService:', error);
      throw new Error('Fallo al crear la preferencia');
    } finally {
      dbClient.release(); 
    }
  }
}