import { Request, Response } from 'express';
import { pool } from '../database.js';
import { redis } from '../config/redis.js'; // <-- INTEGRACIÓN: Ajusta el path a tu cliente Redis

export const createOrder = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    // ⚡ AHORA RECIBIMOS 'items' (EL CARRITO COMPLETO) EN VEZ DE 'product_id'
    const { items, customer_email, customer_name, shipping_address, fbc, fbp, client_user_agent, event_source_url } = req.body;

    // Validación estricta inicial
    if (!items || items.length === 0 || !customer_email || !shipping_address) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para crear la orden' });
    }

    // Iniciamos la transacción SQL. Si algo falla abajo, nada se guarda.
    await client.query('BEGIN');

    // 1. Crear o Actualizar Cliente (Upsert)
    const customerResult = await client.query(
      `INSERT INTO customers (email, first_name, is_guest)
       VALUES ($1, $2, true)
       ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
       RETURNING id`,
      [customer_email, customer_name]
    );
    const customerId = customerResult.rows[0].id;

    // 2. Insertar Dirección de Envío
    const addressResult = await client.query(
      `INSERT INTO customer_addresses (customer_id, street, number, city, state_province, postal_code, country_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        customerId,
        shipping_address.street || 'Sin calle',
        shipping_address.number || 'S/N',
        shipping_address.city,
        shipping_address.state || shipping_address.city,
        shipping_address.zip || '0000000',
        'CL' // Asumiendo Chile por defecto
      ]
    );
    const addressId = addressResult.rows[0].id;

    // 3. Calcular totales iterando sobre el carrito
    let totalLocal = 0;
    for (const item of items) {
      totalLocal += Number(item.price) * Number(item.quantity);
    }

    // Estimación a USD para reportes internos (Tasa referencial de 950 CLP = 1 USD aprox)
    const totalUsd = totalLocal / 950;

    // 4. Crear la Orden padre en estado PENDING_PAYMENT
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, address_id, total_amount_local, total_amount_usd, status)
       VALUES ($1, $2, $3, $4, 'PENDING_PAYMENT') RETURNING id`,
      [customerId, addressId, totalLocal, totalUsd]
    );
    const orderId = orderResult.rows[0].id;

    // <-- INTEGRACIÓN CAPI: Guardar fbc/fbp en Redis por 2 horas para el webhook
    try {
      if (fbc || fbp) {
       await redis.set(`meta:${orderId}`, JSON.stringify({
        fbc: fbc || null,
        fbp: fbp || null,
        client_user_agent: client_user_agent || null,
        event_source_url: event_source_url || null
        }), 'EX', 7200);
      }
    } catch (redisError) {
      console.warn('⚠️ No se pudo guardar fbc/fbp en Redis:', redisError);
      // No hacemos ROLLBACK si falla Redis, la orden debe crearse igual
    }

   
    // ⚡ 5. Insertar TODOS los items del carrito (Incluyendo sus VARIANTES para AutoDS)
    for (const item of items) {
      const unitCostUsd = Number(item.price) / 950; // Estimado de costo

      // --- A. SOLUCIÓN UUID PARA EL PRODUCTO ---
      // Buscamos en la columna 'aliexpress_id' de la tabla 'products'
      const productRes = await client.query(
        'SELECT id FROM products WHERE aliexpress_id = $1 LIMIT 1', 
        [String(item.product_id)]
      );

      if (productRes.rows.length === 0) {
        throw new Error(`Producto con AliExpress ID ${item.product_id} no encontrado en la base de datos local.`);
      }
      const internalProductUuid = productRes.rows[0].id;

      // --- B. SOLUCIÓN UUID PARA LA VARIANTE ---
      let internalVariantUuid = null;
      
      if (item.variant_id) {
        // ⚡ CORRECCIÓN PRECISA: Tu columna se llama 'ali_sku_id' en la tabla 'product_variants'
        const variantRes = await client.query(
          'SELECT id FROM product_variants WHERE ali_sku_id = $1 LIMIT 1',
          [String(item.variant_id)]
        );

        if (variantRes.rows.length > 0) {
          internalVariantUuid = variantRes.rows[0].id;
        } else {
          console.warn(`⚠️ Variante de AliExpress ${item.variant_id} no encontrada. Se insertará como null.`);
        }
      }

      // --- C. INSERCIÓN FINAL CON LOS UUIDs CORRECTOS ---
      // Insertamos en order_items que exige tipo UUID para product_id y variant_id
      await client.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, quantity, unit_price_local, unit_cost_usd)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          orderId,
          internalProductUuid, // UUID interno de tu BD
          internalVariantUuid, // UUID interno de tu BD (o null si no aplica)
          item.quantity,
          item.price,
          unitCostUsd
        ]
      );
    }

    // Confirmamos la transacción y guardamos permanentemente
    await client.query('COMMIT');

    res.status(201).json({ id: orderId, message: 'Orden pendiente creada exitosamente' });

  } catch (error: any) {
    // Si ocurre un error, revertimos todos los inserts para no dejar datos huérfanos
    await client.query('ROLLBACK');
    console.error('🚨 Error interno creando orden:', error);
    res.status(500).json({ error: 'Error interno al crear la orden en la base de datos' });
  } finally {
    // Liberar la conexión al pool para no saturar PostgreSQL
    client.release();
  }
};