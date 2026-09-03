//apps\workers-ai\src\email.service.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export class EmailService {
  
  // ==========================================
  // CORREO 1: BOLETA ELECTRÓNICA
  // ==========================================
  async sendBoletaEmail(customerEmail: string, customerName: string, orderId: string, pdfUrl: string, amount: number) {
    console.log(`✉️ Preparando correo con boleta para ${customerEmail}...`);

    const formattedAmount = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    const shortOrderId = orderId.split('-').pop()?.toUpperCase() || orderId;

    const htmlContent = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 40px 20px; min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto;">
          
          <!-- LOGO RECREADO EN HTML -->
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 32px; font-weight: 900; font-style: italic; letter-spacing: -1.5px; text-transform: uppercase;">
              <span style="color: #ffffff;">RAVS</span><span style="color: #8b5cf6;">STORE</span>
            </div>
            <p style="color: #64748b; font-size: 11px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-top: 8px;">Confirmación de Compra</p>
          </div>
          
          <!-- CONTENEDOR PRINCIPAL -->
          <div style="background-color: #0f172a; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 24px; padding: 40px; box-shadow: 0 10px 40px -10px rgba(139, 92, 246, 0.1);">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">¡Hola, ${customerName}!</h2>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
              Tu experiencia de compra premium ha comenzado. Hemos procesado tu pago de <strong style="color: #ffffff;">${formattedAmount}</strong> con éxito y nuestro sistema automatizado ya está preparando tu orden.
            </p>
            
            <!-- CAJA DE NÚMERO DE ORDEN -->
            <div style="background-color: #020617; border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
              <p style="margin: 0; color: #8b5cf6; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">ID de Orden</p>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${shortOrderId}</p>
            </div>

            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
              Aquí tienes tu documento tributario oficial (SII):
            </p>

            <!-- BOTÓN ESTILO PREMIUM -->
            <div style="text-align: center; margin: 40px 0 20px 0;">
              <a href="${pdfUrl}" target="_blank" style="background-color: #ffffff; color: #000000; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; display: inline-block;">
                Descargar Boleta Electrónica
              </a>
            </div>
          </div>

          <!-- FOOTER -->
          <div style="text-align: center; margin-top: 40px;">
            <p style="color: #475569; font-size: 12px; margin: 0; line-height: 1.5;">
              <strong>RAVS Tech & Media SpA</strong><br>
              Concepción, Biobío, Chile<br>
              <a href="mailto:soporte@ravsstore.com" style="color: #8b5cf6; text-decoration: none;">soporte@ravsstore.com</a>
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'RAVSStore <ventas@ravsstore.com>', 
        to: [customerEmail],
        subject: `Tu comprobante de compra en RAVSStore - Orden #${shortOrderId}`,
        html: htmlContent,
      });
      console.log(`✅ Correo de boleta enviado exitosamente a ${customerEmail}`);
      return true;
    } catch (error) {
      console.error(`🚨 Error enviando boleta a ${customerEmail}:`, error);
      return false;
    }
  }

  // ==========================================
  // CORREO 2: GUÍA DIGITAL (SEPARADO)
  // ==========================================
  async sendDigitalGuideEmail(customerEmail: string, customerName: string, guideName: string, guideUrl: string) {
    console.log(`✉️ Preparando correo de GUÍA DIGITAL para ${customerEmail}...`);

    const htmlContent = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 40px 20px; min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto;">
          
          <!-- LOGO RECREADO EN HTML -->
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 32px; font-weight: 900; font-style: italic; letter-spacing: -1.5px; text-transform: uppercase;">
              <span style="color: #ffffff;">RAVS</span><span style="color: #8b5cf6;">STORE</span>
            </div>
            <p style="color: #8b5cf6; font-size: 11px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-top: 8px;">Contenido Exclusivo</p>
          </div>
          
          <!-- CONTENEDOR PRINCIPAL -->
          <div style="background-color: #0f172a; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 24px; padding: 40px; box-shadow: 0 10px 40px -10px rgba(139, 92, 246, 0.1);">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">¡Hola, ${customerName}!</h2>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
              Tu contenido digital está listo. Gracias por potenciar tus conocimientos con nosotros. A continuación tienes acceso directo a:
            </p>

            <div style="background-color: #020617; border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 16px; font-weight: 700; font-style: italic;">${guideName}</p>
            </div>

            <!-- BOTÓN ESTILO PREMIUM -->
            <div style="text-align: center; margin: 40px 0 20px 0;">
              <a href="${guideUrl}" target="_blank" style="background-color: #ffffff; color: #000000; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; display: inline-block;">
                Descargar Guía Digital
              </a>
            </div>
            
            <p style="color: #475569; font-size: 13px; line-height: 1.5; text-align: center; margin-top: 30px;">
              Guarda este correo de forma segura para acceder a tu material siempre que lo necesites.
            </p>
          </div>

          <!-- FOOTER -->
          <div style="text-align: center; margin-top: 40px;">
            <p style="color: #475569; font-size: 12px; margin: 0; line-height: 1.5;">
              <strong>RAVS Tech & Media SpA</strong><br>
              Concepción, Biobío, Chile<br>
              <a href="mailto:soporte@ravsstore.com" style="color: #8b5cf6; text-decoration: none;">soporte@ravsstore.com</a>
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'RAVSStore <ventas@ravsstore.com>',
        to: [customerEmail],
        subject: `Aquí tienes tu acceso exclusivo: ${guideName}`,
        html: htmlContent,
      });
      console.log(`✅ Correo de GUÍA DIGITAL enviado a ${customerEmail}`);
      return true;
    } catch (error) {
      console.error(`🚨 Error enviando guía a ${customerEmail}:`, error);
      return false;
    }
  }

  // ==========================================
  // CORREO 3: TRACKING DE ENVÍO
  // ==========================================
  async sendTrackingEmail(customerEmail: string, customerName: string, trackingNumber: string, logisticName: string) {
    console.log(`✉️ Preparando correo de SEGUIMIENTO para ${customerEmail}...`);

    // Asumimos 17track como universal, o el de tu preferencia
    const trackingUrl = `https://17track.net/es/track?nums=${trackingNumber}`;

    const htmlContent = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 40px 20px; min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto;">
          
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 32px; font-weight: 900; font-style: italic; letter-spacing: -1.5px; text-transform: uppercase;">
              <span style="color: #ffffff;">RAVS</span><span style="color: #8b5cf6;">STORE</span>
            </div>
            <p style="color: #38bdf8; font-size: 11px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-top: 8px;">Pedido en Camino</p>
          </div>
          
          <div style="background-color: #0f172a; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 24px; padding: 40px; box-shadow: 0 10px 40px -10px rgba(56, 189, 248, 0.1);">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">¡Tu pedido ha sido despachado, ${customerName}!</h2>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
              Te informamos que tu pedido ha salido de nuestras bodegas logísticas y se encuentra oficialmente en tránsito hacia tu dirección a través de <strong>${logisticName}</strong>.
            </p>

            <div style="background-color: #020617; border-left: 4px solid #38bdf8; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
              <p style="margin: 0; color: #38bdf8; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Código de Seguimiento</p>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${trackingNumber}</p>
            </div>

            <div style="text-align: center; margin: 40px 0 20px 0;">
              <a href="${trackingUrl}" target="_blank" style="background-color: #ffffff; color: #000000; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; display: inline-block;">
                Rastrear mi Pedido
              </a>
            </div>
            
            <p style="color: #475569; font-size: 13px; line-height: 1.5; text-align: center; margin-top: 30px;">
              Ten en cuenta que el sistema de rastreo puede tardar hasta 48 horas en reflejar los primeros movimientos.
            </p>
          </div>

          <div style="text-align: center; margin-top: 40px;">
            <p style="color: #475569; font-size: 12px; margin: 0; line-height: 1.5;">
              <strong>RAVS Tech & Media SpA</strong><br>
              Concepción, Biobío, Chile<br>
              <a href="mailto:soporte@ravsstore.com" style="color: #8b5cf6; text-decoration: none;">soporte@ravsstore.com</a>
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'RAVSStore <ventas@ravsstore.com>',
        to: [customerEmail],
        subject: `✈️ ¡Tu pedido de RAVSStore está en camino!`,
        html: htmlContent,
      });
      console.log(`✅ Correo de SEGUIMIENTO enviado a ${customerEmail}`);
      return true;
    } catch (error) {
      console.error(`🚨 Error enviando tracking a ${customerEmail}:`, error);
      return false;
    }
  }

    // ==========================================
  // CORREO EXTRA: NOTIFICACIÓN ADMINISTRADOR SII BOLETA
  // ==========================================
  async sendAdminBillingNotification(adminEmail: string, orderId: string, fichaTexto: string) {
    console.log(`✉️ Enviando ficha de facturación manual al administrador: ${adminEmail}...`);

    const shortOrderId = orderId.split('-').pop()?.toUpperCase() || orderId;

    const htmlContent = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 40px 20px; min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto;">
          
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 32px; font-weight: 900; font-style: italic; letter-spacing: -1.5px; text-transform: uppercase;">
              <span style="color: #ffffff;">RAVS</span><span style="color: #8b5cf6;">STORE</span>
            </div>
            <p style="color: #ef4444; font-size: 11px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-top: 8px;">⚙️ Operaciones Internas</p>
          </div>
          
          <div style="background-color: #0f172a; border: 1px solid #ef4444; border-radius: 24px; padding: 40px; box-shadow: 0 10px 40px -10px rgba(239, 68, 68, 0.1);">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 10px;">¡Boleta Pendiente en el SII!</h2>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 25px;">
              Se ha detectado un pago exitoso, pero el sistema está operando en <strong>Modo Manual</strong>. Copia los siguientes datos para emitir el documento fiscal:
            </p>
            
            <!-- CONTENEDOR CON LA FICHA FORMATEADA -->
            <div style="background-color: #020617; border-left: 4px solid #ef4444; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <pre style="margin: 0; font-family: 'Fira Code', monospace; font-size: 13px; color: #cbd5e1; white-space: pre-wrap; word-wrap: break-word; line-height: 1.5;">${fichaTexto}</pre>
            </div>

            <!-- BOTÓN DIRECTO AL SII -->
            <div style="text-align: center; margin-top: 35px; margin-bottom: 10px;">
              <a href="https://sii.cl" target="_blank" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; display: inline-block;">
                Ir al Portal de Boletas SII
              </a>
            </div>
          </div>

          <div style="text-align: center; margin-top: 40px;">
            <p style="color: #475569; font-size: 12px; margin: 0;">
              <strong>AetherTrade Core Engine</strong><br>
              Automatización de Facturación de Respaldo
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'AetherTrade Engine <ventas@ravsstore.com>',
        to: [adminEmail],
        subject: `🚨 [SII BOLETA] Emitir Boleta Manual - Orden #${shortOrderId}`,
        html: htmlContent,
      });
      console.log(`✅ Ficha de facturación enviada con éxito a ${adminEmail}`);
      return true;
    } catch (error) {
      console.error(`🚨 Error enviando ficha al administrador ${adminEmail}:`, error);
      return false;
    }
  }
  // ==========================================
  // CORREO EXTRA 2: CONFIRMACIÓN DE COMPRA (PRE-BOLETA CLIENTE)
  // ==========================================
  async sendOrderConfirmationPlaceholderEmail(customerEmail: string, customerName: string, orderId: string, amount: number) {
    console.log(`✉️ Enviando correo de confirmación de pago (Pre-Boleta) a ${customerEmail}...`);

    const formattedAmount = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    const shortOrderId = orderId.split('-').pop()?.toUpperCase() || orderId;

    const htmlContent = `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #020617; color: #ffffff; padding: 40px 20px; min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto;">
          
          <!-- LOGO -->
          <div style="text-align: center; margin-bottom: 40px;">
            <div style="font-size: 32px; font-weight: 900; font-style: italic; letter-spacing: -1.5px; text-transform: uppercase;">
              <span style="color: #ffffff;">RAVS</span><span style="color: #8b5cf6;">STORE</span>
            </div>
            <p style="color: #10b981; font-size: 11px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; margin-top: 8px;">Pago Confirmado exitosamente</p>
          </div>
          
          <!-- CONTENEDOR PRINCIPAL -->
          <div style="background-color: #0f172a; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 24px; padding: 40px; box-shadow: 0 10px 40px -10px rgba(16, 185, 129, 0.1);">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">¡Gracias por tu compra, ${customerName}!</h2>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
              Queremos informarte que hemos recibido tu pago de <strong style="color: #ffffff;">${formattedAmount}</strong> correctamente. Nuestro equipo ya se encuentra preparando los detalles logísticos de tu pedido para asegurar una experiencia premium.
            </p>
            
            <!-- CAJA NÚMERO DE ORDEN -->
            <div style="background-color: #020617; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
              <p style="margin: 0; color: #10b981; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Número de Seguimiento Interno</p>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 20px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">#${shortOrderId}</p>
            </div>

            <!-- AVISO DE BOLETA SII -->
            <div style="background-color: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.05);">
              <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">
                📌 <strong>Nota sobre tu boleta electrónica:</strong><br>
                Tu documento tributario oficial está siendo procesado por nuestro departamento de facturación ante el SII y **será enviado a este mismo correo a la brevedad posible**. No necesitas realizar ninguna acción adicional.
              </p>
            </div>
          </div>

          <!-- FOOTER -->
          <div style="text-align: center; margin-top: 40px;">
            <p style="color: #475569; font-size: 12px; margin: 0; line-height: 1.5;">
              <strong>RAVS Tech & Media SpA</strong><br>
              Concepción, Biobío, Chile<br>
              <a href="mailto:soporte@ravsstore.com" style="color: #8b5cf6; text-decoration: none;">soporte@ravsstore.com</a>
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await resend.emails.send({
        from: 'RAVSStore <ventas@ravsstore.com>',
        to: [customerEmail],
        subject: `¡Confirmamos tu pago con éxito! - Orden #${shortOrderId}`,
        html: htmlContent,
      });
      console.log(`✅ Correo de cortesía / pre-boleta enviado exitosamente a ${customerEmail}`);
      return true;
    } catch (error) {
      console.error(`🚨 Error enviando correo de cortesía a ${customerEmail}:`, error);
      return false;
    }
  }

}

// ⚡ Instancia exportada para usarla directamente en los workers
export const emailService = new EmailService();