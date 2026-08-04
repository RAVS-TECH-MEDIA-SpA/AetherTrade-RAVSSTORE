import { MercadoPagoConfig, Preference } from 'mercadopago';
import { pool } from '../database.js'; // ⚡ Importamos tu conexión a BD
import { randomUUID } from 'crypto';

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN || '' });

export class CheckoutService {

  async createPreference(orderData: any) {
    const dbClient = await pool.connect();
    
    try {
      await dbClient.query('BEGIN'); // Iniciamos transacción

      const generatedOrderId = randomUUID(); 
      const totalAmount = orderData.items.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);

      // ⚡ LECTURA DE URL PARA EL RETORNO AL FRONTEND (PUERTO 3000)
      const rawUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const frontendUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

      // 1. Crear Preferencia en Mercado Pago
      const preference = new Preference(client);
      const mpItems = orderData.items.map((item: any) => ({
        id: String(item.product_id || item.id), // ⚡ Corregido: lee product_id del frontend
        title: String(item.title),
        unit_price: parseInt(String(item.price), 10), // ⚡ FORZAMOS a que sea un número entero estricto
        quantity: parseInt(String(item.quantity), 10), // ⚡ Forzamos cantidad también por seguridad
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
          // ⚡ AÑADIMOS LAS URLS PARA QUE EL CLIENTE VUELVA A TU TIENDA TRAS PAGAR
        // En la creación de tu preferencia en el backend
        // ⚡ AÑADIMOS LAS URLS PARA QUE EL CLIENTE VUELVA A TU TIENDA TRAS PAGAR
          back_urls: {
            success: `${frontendUrl}/checkout/success`, 
            failure: `${frontendUrl}/checkout`,
            pending: `${frontendUrl}/checkout`
          },
          auto_return: "approved",
        }
      });

      // 2. Gestionar el Cliente (Upsert en tabla 'customers')
      // Si el email no existe, lo crea. Si existe, actualiza su nombre.
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

      // 3. Crear la Orden (Vinculada al Cliente y a Mercado Pago)
      const insertOrderQuery = `
        INSERT INTO orders (id, customer_id, mp_preference_id, status, total_amount_local, total_amount_usd)
        VALUES ($1, $2, $3, 'PENDING_PAYMENT', $4, $4)
      `;
      await dbClient.query(insertOrderQuery, [
        generatedOrderId, 
        customerId,
        mpResponse.id, 
        totalAmount
      ]);

     // 4. Guardar los Items de la Orden
      for (const item of orderData.items) {
        let realProductId = String(item.productId || item.id);

        // ⚡ DETECTOR DE UUID: Si no tiene formato de UUID, asumimos que es el ID de AliExpress
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(realProductId)) {
          // Buscamos el UUID real en tu tabla products usando el aliexpress_id
          const productSearch = await dbClient.query(
            'SELECT id FROM products WHERE aliexpress_id = $1 LIMIT 1',
            [realProductId]
          );
          
          if (productSearch.rows.length > 0) {
            realProductId = productSearch.rows[0].id; // Reemplazamos por el UUID correcto
          } else {
            throw new Error(`El producto con ID AliExpress ${realProductId} no existe en tu tabla 'products'.`);
          }
        }

        // Ahora insertamos con toda seguridad
        await dbClient.query(`
          INSERT INTO order_items (order_id, product_id, quantity, unit_price_local, unit_cost_usd)
          VALUES ($1, $2, $3, $4, $4)
        `, [
          generatedOrderId,
          realProductId, // 👈 Aquí pasamos el UUID real aceptado por Postgres
          item.quantity,
          item.price // unit_price_local
        ]);
      }

      await dbClient.query('COMMIT'); 
      return { preferenceId: mpResponse.id };

    } catch (error: any) {
      await dbClient.query('ROLLBACK'); 
      console.error('❌ Error en CheckoutService:', error);
      throw new Error('Fallo al crear la preferencia');
    } finally {
      dbClient.release(); 
    }
  }
}