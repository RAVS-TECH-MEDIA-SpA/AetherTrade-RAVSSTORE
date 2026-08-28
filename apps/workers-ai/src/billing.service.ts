// apps/workers-ai/src/billing.service.ts
import { pool } from './lib/db.js';
import axios from 'axios';
import { EmailService } from './email.service.js'; 

const emailService = new EmailService(); 

export class BillingService {
  private simpleFacturaUrl = 'https://api.simplefactura.cl/invoiceV2/Casa_Matriz';
  
  private authUrl = process.env.SIMPLEFACTURA_AUTH_URL || 'https://api.simplefactura.cl/token';
  private authEmail = process.env.SIMPLEFACTURA_EMAIL;
  private authPassword = process.env.SIMPLEFACTURA_PASSWORD;

  // ============================================================================
  // ⚡ CACHÉ DISTRIBUIDO EN POSTGRESQL (Resistente a reinicios de Cloud Run)
  // ============================================================================
  private async getToken(): Promise<string> {
    try {
      // 1. Buscamos en la base de datos si hay un token vigente compartido
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
      // Definimos expiración a 50 minutos desde ahora
      const expiresAt = new Date(Date.now() + 50 * 60 * 1000); 

      // 2. Guardamos o actualizamos el token en la base de datos para que lo compartan todas las instancias
      await pool.query(`
        INSERT INTO api_tokens (key, token, expires_at)
        VALUES ('simplefactura', $1, $2)
        ON CONFLICT (key) DO UPDATE 
        SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at
      `, [newToken, expiresAt]);
      
      return newToken;
    } catch (error: any) {
      console.error(`🚨 Error de Autenticación en SimpleFactura:`, error.response?.data || error.message);
      throw new Error('No se pudo obtener el token de facturación');
    }
  }

  async processBilling(orderId: string) {
    console.log(`🧾 Iniciando facturación electrónica (DEMO) para orden: ${orderId}`);

    try {
      // ⚡ Obtenemos el token compartido de forma segura
      const token = await this.getToken();

      const orderQuery = `
        SELECT 
          o.id, o.total_amount_local, o.created_at,
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
        SELECT 
          i.quantity, 
          i.unit_price_local, 
          p.title_original as name, 
          gd.titulo as guide_title, 
          gd.storage_url as guide_url
        FROM order_items i
        JOIN products p ON i.product_id = p.id
        LEFT JOIN guias_digitales gd ON gd.product_id = p.id AND gd.is_active = true
        WHERE i.order_id = $1
      `;
      const { rows: items } = await pool.query(itemsQuery, [orderId]);

      const fechaEmision = new Date().toISOString().split('T')[0];

      // 4. Construir Detalles con Desglose de IVA (Obligatorio para el SII)
      const detalles = items.map((item, index) => {
        const precioUnitarioBruto = Math.round(item.unit_price_local);
        const cantidad = item.quantity;
        const totalBrutoLinea = precioUnitarioBruto * cantidad;

        // Desglose oficial en Chile (IVA 19%)
        const montoNetoLinea = Math.round(totalBrutoLinea / 1.19);

        return {
          NroLinDet: index + 1,
          NmbItem: item.name.substring(0, 80),
          QtyItem: cantidad,
          PrcItem: Math.round(precioUnitarioBruto / 1.19), // Precio unitario neto
          MontoItem: montoNetoLinea, // Monto neto de la línea
          IndExe: 0 // 0 = Afecto a IVA (19%)
        };
      });

      // Calculamos el total neto y el total de IVA sumando las líneas
      const mntNeto = detalles.reduce((acc, d) => acc + d.MontoItem, 0);
      const mntTotalBruto = Math.round(order.total_amount_local);
      const iva19 = mntTotalBruto - mntNeto;

      // 5. Payload Boleta (Tipo 39 adaptado al esquema exacto del SII / SimpleFactura)
      const payload = {
        dte: 39, // ⚡ Requerido en la raíz del objeto
        Documento: {
          Encabezado: {
            IdDoc: { TipoDTE: 39, FchEmis: fechaEmision, IndServicio: 3 },
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
      
      let folio = 'DEMO-001';
      let pdfUrl = 'https://api.simplefactura.cl';

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
        pdfUrl = resData?.PdfUrl || resData?.pdfUrl || resData?.pdf_url || resData?.urlPdf || resData?.linkPdf || 'https://api.simplefactura.cl';
      } catch (apiError: any) {
        console.warn(`⚠️ [SimpleFactura Aviso] No se pudo emitir en el SII (probablemente por falta de folios en cuenta Demo):`, apiError.response?.data || apiError.message);
        console.log(`💡 [Modo Resiliente] Continuando con el flujo de correos utilizando datos de respaldo para pruebas...`);
      }

      await pool.query(
        `UPDATE orders SET billing_status = 'ISSUED', billing_folio = $1, billing_url = $2 WHERE id = $3`,
        [String(folio), pdfUrl, orderId]
      );

      console.log(`✅ Registro de orden actualizado. Folio: ${folio}`);

      // =========================================================
      // 8. ENVIAR CORREOS (BLINDADO PARA DISPARARSE SIEMPRE)
      // =========================================================
      if (order.email) {
        const customerFirstName = order.first_name || 'Cliente';
        
        // A. Mandamos la boleta
        await emailService.sendBoletaEmail(order.email, customerFirstName, orderId, pdfUrl, Number(order.total_amount_local));

        // B. Filtramos los items que tengan un guide_url válido desde la base de datos
        const digitalGuides = items.filter(item => item.guide_url !== null);
        
        for (const guide of digitalGuides) {
          const guideName = guide.guide_title || 'Guía Exclusiva RAVSStore';
          await emailService.sendDigitalGuideEmail(order.email, customerFirstName, guideName, guide.guide_url);
        }
      }

    } catch (error: any) {
      console.error(`❌ Error general en proceso de facturación (Orden ${orderId}):`, error.message);
      await pool.query(`UPDATE orders SET billing_status = 'FAILED' WHERE id = $1`, [orderId]);
    }
  }
}