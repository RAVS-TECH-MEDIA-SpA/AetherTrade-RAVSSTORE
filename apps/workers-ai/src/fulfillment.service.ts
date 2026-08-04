import { pool } from './lib/db.js'; // <-- CORREGIDO A POOL
import axios from 'axios';

export class FulfillmentService {
  private autoDsToken = process.env.AUTODS_API_TOKEN;
  private autoDsStoreId = process.env.AUTODS_STORE_ID;

  async processOrderToAutoDS(orderId: string) {
    console.log(`⏳ Iniciando fulfillment para orden: ${orderId}`);

    try {
      // 1. Obtener todos los datos agrupados usando un JOIN
      const query = `
        SELECT 
          o.id as order_id, 
          c.email, c.first_name, 
          a.street, a.city, a.state_province, a.postal_code, a.country_code,
          i.quantity, 
          p.autods_item_id
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_addresses a ON o.address_id = a.id
        JOIN order_items i ON i.order_id = o.id
        JOIN products p ON i.product_id = p.id
        WHERE o.id = $1
      `;
      
      const { rows } = await pool.query(query, [orderId]); // <-- USANDO POOL
      
      if (rows.length === 0) throw new Error('Orden no encontrada o sin items');
      const data = rows[0];

      if (!data.autods_item_id) {
        throw new Error(`Producto no tiene autods_item_id configurado`);
      }

      // 2. Construir Payload para AutoDS API (Formato Create Order)
      const payload = {
        store_id: this.autoDsStoreId,
        buyer_email: data.email,
        shipping_address: {
          name: data.first_name || 'Cliente',
          street: data.street,
          city: data.city,
          state: data.state_province,
          country: data.country_code,
          zip: data.postal_code,
          phone: "+56900000000" // Valor por defecto si no lo capturas
        },
        order_items: [
          {
            item_id: data.autods_item_id,
            quantity: data.quantity
          }
        ]
      };

      // 3. Enviar a AutoDS
      const response = await axios.post('https://api.autods.com/openapi/orders', payload, {
        headers: { 
          'Authorization': `Bearer ${this.autoDsToken}`,
          'Content-Type': 'application/json'
        }
      });

      const autoDsOrderId = response.data.id; 

      // 4. Actualizar BD
      await pool.query( // <-- USANDO POOL
        `UPDATE orders SET status = 'PROCESSING_IN_AUTODS', autods_order_id = $1 WHERE id = $2`,
        [autoDsOrderId, orderId]
      );

      console.log(`✅ Orden ${orderId} enviada a AutoDS exitosamente (Ref: ${autoDsOrderId})`);

    } catch (error: any) {
      console.error(`❌ Error fulfillment AutoDS (Orden ${orderId}):`, error.response?.data || error.message);
      // Marcar para revisión manual
      await pool.query(`UPDATE orders SET status = 'MANUAL_REVIEW' WHERE id = $1`, [orderId]); // <-- USANDO POOL
    }
  }
}