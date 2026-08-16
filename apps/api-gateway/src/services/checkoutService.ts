import { MercadoPagoConfig, Preference } from 'mercadopago';
import { pool } from '../database.js'; 
import { randomUUID } from 'crypto';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });

export class CheckoutService {

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
        id: String(item.productId || item.product_id || item.id), 
        title: String(item.title || '').substring(0, 250),
        unit_price: Number(item.price), 
        quantity: Number(item.quantity),
        currency_id: 'CLP'
      }));
      
      console.log("🚀 Creando preferencia en Mercado Pago con items:", mpItems);
      
      const mpResponse = await preference.create({
        body: {
          items: mpItems,
          external_reference: generatedOrderId,
          back_urls: {
            success: `${frontendUrl}/checkout/success`, 
            failure: `${frontendUrl}/checkout/failure`,
            pending: `${frontendUrl}/checkout/pending`
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
      // Adaptamos para soportar 'customer' o 'customerInfo'
      const customerData = orderData.customer || orderData.customerInfo;
      const customerResult = await dbClient.query(upsertCustomerQuery, [
        customerData.email,
        customerData.firstName || customerData.name?.split(' ')[0] || 'Cliente',
        customerData.lastName || customerData.name?.split(' ').slice(1).join(' ') || '',
        customerData.phone || null
      ]);
      const customerId = customerResult.rows[0].id;

      // ============================================================================
      // ⚡ 2.5. GUARDAR LA DIRECCIÓN DE ENVÍO PARA AUTODS
      // ============================================================================
     // ============================================================================
      // ⚡ 2.5. GUARDAR LA DIRECCIÓN DE ENVÍO PARA AUTODS (CON DETALLES)
      // ============================================================================
      const insertAddressQuery = `
        INSERT INTO customer_addresses (customer_id, street, number, city, state_province, postal_code, country_code, details)
        VALUES ($1, $2, $3, $4, $5, $6, 'CL', $7)
        RETURNING id;
      `;
      const shipping = orderData.shippingAddress || {};
      const addressResult = await dbClient.query(insertAddressQuery, [
        customerId,
        shipping.street || 'Sin calle',
        shipping.number || 'S/N',
        shipping.city || 'Sin ciudad',
        shipping.state || 'Región Metropolitana',
        shipping.zip || '0000000',
        shipping.details || null // ⚡ Se guarda el detalle o queda nulo si no lo llenaron
      ]);
      const addressId = addressResult.rows[0].id;
      // ============================================================================
      // 3. Crear la Orden (⚡ AHORA CON EL ADDRESS_ID VINCULADO)
      // ============================================================================
      const insertOrderQuery = `
        INSERT INTO orders (id, customer_id, address_id, mp_preference_id, status, total_amount_local, total_amount_usd, client_tracking_data)
        VALUES ($1, $2, $3, $4, 'PENDING_PAYMENT', $5, 0, $6)
      `;
      await dbClient.query(insertOrderQuery, [
        generatedOrderId, 
        customerId,
        addressId, // ⚡ Se inyecta el ID generado en el paso 2.5
        mpResponse.id, 
        totalAmount,
        trackingData
      ]);

      // ============================================================================
      // 4. EL CRUCE INTELIGENTE DE IDs Y VARIANTES
      // ============================================================================
      for (const item of orderData.items) {
        let incomingId = String(item.productId || item.product_id || item.id).trim();
        let variantId = item.variantId || item.variant_id ? String(item.variantId || item.variant_id).trim() : null;
        
        if (variantId === 'undefined' || variantId === 'null') variantId = null;

        if (incomingId.includes('-') && !incomingId.match(/^[0-9a-fA-F-]{36}$/)) {
          incomingId = incomingId.split('-')[0];
        }

        let realProductId = null;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(incomingId);

        if (isUUID) {
          const search = await dbClient.query('SELECT id FROM products WHERE id = $1 LIMIT 1', [incomingId]);
          if (search.rows.length > 0) {
            realProductId = search.rows[0].id;
          } else {
            throw new Error(`El producto con UUID ${incomingId} no existe en la BD.`);
          }
        } else {
          const search = await dbClient.query('SELECT id FROM products WHERE aliexpress_id = $1 LIMIT 1', [incomingId]);
          if (search.rows.length > 0) {
            realProductId = search.rows[0].id;
          } else {
            throw new Error(`Producto con AliExpress ID ${incomingId} no encontrado.`);
          }
        }

        let realVariantId = null;
        if (variantId) {
          const isVariantUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variantId);
          
          if (isVariantUUID) {
            const vSearch = await dbClient.query('SELECT id FROM product_variants WHERE id = $1 LIMIT 1', [variantId]);
            if (vSearch.rows.length > 0) {
              realVariantId = vSearch.rows[0].id;
            } else {
              throw new Error(`La variante con UUID ${variantId} no existe.`);
            }
          } else {
            const vSearch = await dbClient.query('SELECT id FROM product_variants WHERE ali_sku_id = $1 LIMIT 1', [variantId]);
            if (vSearch.rows.length > 0) {
              realVariantId = vSearch.rows[0].id;
            } else {
              throw new Error(`Variante con AliExpress SKU ID ${variantId} no encontrada.`);
            }
          }
        }

        await dbClient.query(`
          INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price_local, unit_cost_usd)
          VALUES ($1, $2, $3, $4, $5, 0)
        `, [
          generatedOrderId,
          realProductId,
          realVariantId,
          item.quantity,
          item.price
        ]);
      }

      await dbClient.query('COMMIT'); 
      console.log("✅ Preferencia creada con éxito en Mercado Pago");
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