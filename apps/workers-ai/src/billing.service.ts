import { pool } from './lib/db.js';
import axios from 'axios';
import { EmailService } from './email.service.js';

const emailService = new EmailService();

export class BillingService {
  private MODO_SII_MANUAL = true;
  private ADMIN_EMAIL = process.env.ADMIN_BILLING_EMAIL || 'ravstechmediaspa@gmail.com';
  
  // Corregido: Separación de las variables de URL y credenciales que estaban pegadas
  private simpleFacturaUrl = 'https://simplefactura.cl'; 
  private authUrl = process.env.SIMPLEFACTURA_AUTH_URL || 'https://simplefactura.cl';
  private authEmail = process.env.SIMPLEFACTURA_EMAIL;
  private authPassword = process.env.SIMPLEFACTURA_PASSWORD;

  private async getToken(): Promise<string> {
    if (this.MODO_SII_MANUAL) return 'MODO_MANUAL_ACTIVO';
    
    try {
      const { rows } = await pool.query(
        `SELECT token FROM api_tokens WHERE key = 'simplefactura' AND expires_at > NOW() LIMIT 1`
      );
      
      if (rows.length > 0) {
        console.log(`🔐 Usando token de SimpleFactura compartido desde la Base de Datos...`);
        return rows[0].token;
      }
    } catch (dbErr) {
      console.warn(`⚠️ No se pudo leer el caché de tokens de la BD, procediendo a solicitar uno nuevo...`, dbErr);
    }
    
    console.log(`🔐 Solicitando token fresco a SimpleFactura...`);
    
    try {
      const response = await axios.post(this.authUrl, {
        email: this.authEmail,
        password: this.authPassword
      });
      
      const newToken = response.data.accessToken;
      const expiresAt = new Date(Date.now() + 50 * 60 * 1000);
      
      await pool.query(
        `INSERT INTO api_tokens (key, token, expires_at) 
         VALUES ('simplefactura', $1, $2) 
         ON CONFLICT (key) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at`,
        [newToken, expiresAt]
      );
      
      return newToken;
    } catch (error: any) {
      console.error(`🚨 Error de Autenticación en SimpleFactura:`, error.response?.data || error.message);
      throw new Error('No se pudo obtener el token de facturación');
    }
  }

  async processBilling(orderId: string) {
    console.log(`🧾 Iniciando proceso de facturación para orden: ${orderId}`);
    
    try {
      const token = await this.getToken();
      
      const orderQuery = `
        SELECT o.id, o.total_amount_local, o.created_at, 
               c.first_name, c.last_name, c.email, c.phone, c.document_id, 
               a.street, a.city, a.state_province 
        FROM orders o 
        JOIN customers c ON o.customer_id = c.id 
        LEFT JOIN customer_addresses a ON o.address_id = a.id 
        WHERE o.id = $1
      `;
      const { rows: orderRows } = await pool.query(orderQuery, [orderId]);
      
      if (orderRows.length === 0) throw new Error('Orden no encontrada');
      const order = orderRows[0];
      
      const itemsQuery = `
        SELECT i.quantity, i.unit_price_local, 
               p.title_original as name, 
               gd.titulo as guide_title, gd.storage_url as guide_url 
        FROM order_items i 
        JOIN products p ON i.product_id = p.id 
        LEFT JOIN guias_digitales gd ON gd.product_id = p.id AND gd.is_active = true 
        WHERE i.order_id = $1
      `;
      const { rows: items } = await pool.query(itemsQuery, [orderId]);
      
      const fechaEmision = new Date().toISOString().split('T')[0];
      
      const detalles = items.map((item, index) => {
        const precioUnitarioBruto = Math.round(item.unit_price_local);
        const cantidad = item.quantity;
        const totalBrutoLinea = precioUnitarioBruto * cantidad;
        const montoNetoLinea = Math.round(totalBrutoLinea / 1.19);
        
        return {
          NroLinDet: index + 1,
          NmbItem: item.name.substring(0, 80),
          QtyItem: cantidad,
          PrcItem: Math.round(precioUnitarioBruto / 1.19),
          MontoItem: montoNetoLinea,
          IndExe: 0
        };
      });
      
      const mntNeto = detalles.reduce((acc, d) => acc + d.MontoItem, 0);
      const mntTotalBruto = Math.round(order.total_amount_local);
      const iva19 = mntTotalBruto - mntNeto;
      
      let folio = 'MANUAL-PENDIENTE';
      let pdfUrl = 'https://sii.cl';
      
            // 5. FLUJO BIFURCADO: MODO MANUAL SII (Integración del Correo de Cortesía al Cliente)
      if (this.MODO_SII_MANUAL) {
        console.log(`💡 [Modo Manual SII] Generando ficha de copia para el administrador...`);
        
        // 5.1 Generamos la ficha técnica exacta para el administrador
        const fichaSIITexto = `
==================================================
📝 FICHA DE EMISIÓN DE BOLETA MANUAL (SII)
==================================================
ID ORDEN: ${orderId}
FECHA VENTA: ${fechaEmision}
--------------------------------------------------
👤 DATOS DEL RECEPTOR (CLIENTE):
RUT: ${order.document_id || "66.666.666-6 (Sin RUT)"}
RECEPTOR: ${order.first_name} ${order.last_name || ''}
EMAIL: ${order.email || "No registra"}
TELÉFONO: ${order.phone || "No registra"}
DIRECCIÓN: ${order.street || "Sin Dirección"}, ${order.city || "Santiago"}
--------------------------------------------------
📊 DESGLOSE ECONÓMICO:
MONTO NETO: $${mntNeto} CLP
IVA (19%): $${iva19} CLP
TOTAL BRUTO: $${mntTotalBruto} CLP
--------------------------------------------------
🛒 DETALLE DE ARTÍCULOS:
${items.map(i => `- (${i.quantity}x) ${i.name.substring(0, 60)} -> Unitario: $${Math.round(i.unit_price_local)} CLP`).join('\n')}
==================================================
Instrucciones: Emite la boleta afecta en sii.cl, copia el Folio asignado y actualiza el registro en Supabase.`;

        // 5.2 Notificamos al Administrador con la ficha de copia rápida
        try {
          await emailService.sendAdminBillingNotification(this.ADMIN_EMAIL, orderId, fichaSIITexto);
          console.log(`✉️ Ficha de facturación enviada con éxito al administrador (${this.ADMIN_EMAIL}).`);
        } catch (mailErr: any) {
          console.error(`🚨 Error enviando ficha al Administrador:`, mailErr.message);
        }

        // 5.3 🌟 NUEVO: Enviamos el correo de cortesía/tranquilidad al cliente final
        if (order.email) {
          try {
            const customerFirstName = order.first_name || 'Cliente';
            await emailService.sendOrderConfirmationPlaceholderEmail(
              order.email,
              customerFirstName,
              orderId,
              Number(order.total_amount_local)
            );
          } catch (customerMailErr: any) {
            console.error(`🚨 Error enviando correo de cortesía al cliente:`, customerMailErr.message);
          }
        }

        // 5.4 Dejamos el estado 'PENDING' en Supabase para control de boletas manuales
        await pool.query(
          `UPDATE orders SET billing_status = 'PENDING', billing_folio = $1, billing_url = $2 WHERE id = $3`,
          [folio, pdfUrl, orderId]
        );

      } else {

        const payload = {
          dte: 39,
          Documento: {
            Encabezado: {
              IdDoc: {
                TipoDTE: 39,
                FchEmis: fechaEmision,
                IndServicio: 3
              },
              Emisor: {
                RUTEmisor: "78181331-1",
                RznSocEmisor: "RAVS TECH & MEDIA SPA",
                GiroEmisor: "VENTA AL POR MENOR POR CORREO, POR INTERNET Y VIA TELEFONICA",
                DirOrigen: "Colo colo 222, Of 1008",
                CmnaOrigen: "Concepción"
              },
              Receptor: {
                RUTRecep: order.document_id || "66666666-6",
                RznSocRecep: `${order.first_name} ${order.last_name || ''}`.trim() || "Cliente Final",
                DirRecep: order.street || "Sin Dirección",
                CmnaRecep: order.city || "Santiago"
              },
              Totales: {
                MntNeto: mntNeto,
                MntIVA: iva19,
                MntTotal: mntTotalBruto,
                VlrPagar: mntTotalBruto
              }
            },
            Detalle: detalles
          }
        };
        
        console.log(`📤 Enviando boleta a SimpleFactura...`);
        folio = 'DEMO-001';
        pdfUrl = 'https://simplefactura.cl';
        
        try {
          const response = await axios.post(this.simpleFacturaUrl, payload, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log("📦 [SimpleFactura Response]:", JSON.stringify(response.data, null, 2));
          
          const resData = response.data?.data || response.data;
          folio = resData?.Folio || resData?.folio || resData?.Encabezado?.IdDoc?.Folio || resData?.number || 'DEMO-001';
          pdfUrl = resData?.PdfUrl || resData?.pdfUrl || resData?.pdf_url || resData?.urlPdf || resData?.linkPdf || 'https://simplefactura.cl';
          
        } catch (apiError: any) {
          console.warn(`⚠️ [SimpleFactura Aviso] No se pudo emitir en el SII:`, apiError.response?.data || apiError.message);
          console.log(`💡 [Modo Resiliente] Continuando con el flujo de correos utilizando datos de respaldo para pruebas...`);
        }
        
        await pool.query(
          `UPDATE orders SET billing_status = 'ISSUED', billing_folio = $1, billing_url = $2 WHERE id = $3`, 
          [String(folio), pdfUrl, orderId]
        );
        console.log(`✅ Registro de orden actualizado. Folio: ${folio}`);
        
        if (order.email) {
          const customerFirstName = order.first_name || 'Cliente';
          await emailService.sendBoletaEmail(order.email, customerFirstName, orderId, pdfUrl, Number(order.total_amount_local));
        }
      }
      
      if (order.email) {
        const customerFirstName = order.first_name || 'Cliente';
        const digitalGuides = items.filter(item => item.guide_url !== null);
        
        for (const guide of digitalGuides) {
          const guideName = guide.guide_title || 'Guía Exclusiva RAVSStore';
          await emailService.sendDigitalGuideEmail(order.email, customerFirstName, guideName, guide.guide_url);
        }
      }
      
    } catch (error: any) {
      console.error(`❌ Error general en proceso de facturación (Orden ${orderId}):`, error.message);
      await pool.query(
        `UPDATE orders SET billing_status = 'FAILED' WHERE id = $1`, 
        [orderId]
      );
    }
  }
}