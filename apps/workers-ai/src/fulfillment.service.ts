// import { query } from './database';
// import axios from 'axios';

// export class FulfillmentService {
//   private apiKey = process.env.RAPID_API_KEY;

//   async processOrder(pubSubEvent: any) {
//     const { orderId, customer, productSku } = pubSubEvent;

//     // 1. Obtener datos detallados del producto y reglas fiscales
//     const orderData = await query(
//       `SELECT p.aliexpress_id, p.base_cost_usd, t.country_code 
//        FROM products p, tax_rules t 
//        WHERE p.sku = $1 AND t.country_code = $2`,
//       [productSku, customer.address.country]
//     );

//     const product = orderData.rows[0];

//     // 2. Ejecutar el pedido en AliExpress (vía Proxy API)
//     try {
//       const response = await axios.post('https://aliexpress-dropshipping.p.rapidapi.com/place_order', {
//         item_id: product.aliexpress_id,
//         quantity: 1,
//         shipping_address: {
//           name: customer.name,
//           address: customer.address.line1,
//           city: customer.address.city,
//           zip: customer.address.postal_code,
//           country: customer.address.country,
//           phone: customer.phone || '000000000' // AliExpress exige teléfono
//         }
//       }, {
//         headers: { 'X-RapidAPI-Key': this.apiKey }
//       });

//       const aliOrderId = response.data.order_id;

//       // 3. Registrar éxito y actualizar DB
//       await query(
//         `UPDATE orders SET status = 'ordered', external_id = $1 WHERE id = $2`,
//         [aliOrderId, orderId]
//       );

//       console.log(`✅ Orden exitosa en AliExpress: ${aliOrderId} para el cliente ${customer.email}`);

//     } catch (error) {
//       console.error('❌ Error crítico en Fulfillment:', error);
//       // Aquí dispararías una alerta a tu Slack/Discord o pondrías la orden en 'manual_review'
//       await query(`UPDATE orders SET status = 'manual_review' WHERE id = $1`, [orderId]);
//     }
//   }
// }