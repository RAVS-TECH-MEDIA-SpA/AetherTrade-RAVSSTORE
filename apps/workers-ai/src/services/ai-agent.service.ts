import cron from 'node-cron';
import { emailService } from '../email.service.js';
import { GeminiService } from '../gemini.service.js';
import { pool } from '../lib/db.js';

interface AbandonedOrder {
  id: string;
  email: string;
  first_name: string | null;
  total_amount_local: number;
  recovery_token: string;
  items: Array<{ title: string; quantity: number; price: number }>;
}

const gemini = new GeminiService();

class AiAgentService {
  private isStarted = false;

  startAbandonedCartRecovery(): void {
    if (this.isStarted) return;
    this.isStarted = true;
    cron.schedule('*/15 * * * *', () => {
      void this.processAbandonedCarts();
    });
    console.log('🛒 Agente de recuperación de carrito activo (requiere consentimiento).');
  }

  private async processAbandonedCarts(): Promise<void> {
    try {
      const { rows } = await pool.query<AbandonedOrder>(`
        SELECT
          o.id,
          c.email,
          c.first_name,
          o.total_amount_local,
          o.client_tracking_data->>'cart_recovery_token' AS recovery_token,
          json_agg(json_build_object(
            'title', COALESCE(p.marketing_copy->>'title_localized', p.title_original, g.titulo),
            'quantity', oi.quantity,
            'price', oi.unit_price_local
          ) ORDER BY oi.id) AS items
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN products p ON p.id = oi.product_id
        LEFT JOIN guias_digitales g ON g.id = oi.guia_id
        WHERE o.status = 'PENDING_PAYMENT'
          AND o.created_at <= NOW() - INTERVAL '2 hours'
          AND o.created_at >= NOW() - INTERVAL '24 hours'
          AND o.client_tracking_data->>'abandoned_cart_consent' = 'true'
          AND o.client_tracking_data->>'cart_recovery_token' IS NOT NULL
          AND o.client_tracking_data->>'cart_recovery_email_sent_at' IS NULL
          AND (
            o.client_tracking_data->>'cart_recovery_claimed_at' IS NULL
            OR (o.client_tracking_data->>'cart_recovery_claimed_at')::timestamptz < NOW() - INTERVAL '30 minutes'
          )
          AND c.email IS NOT NULL
          AND (oi.product_id IS NOT NULL OR oi.guia_id IS NOT NULL)
        GROUP BY o.id, c.email, c.first_name, o.total_amount_local, o.client_tracking_data
        ORDER BY o.created_at ASC
        LIMIT 50
      `);

      for (const order of rows) {
        await this.sendRecoveryEmail(order);
      }
    } catch (error) {
      console.error('Error consultando carritos pendientes de recuperación:', error);
    }
  }

  private async sendRecoveryEmail(order: AbandonedOrder): Promise<void> {
    const claim = await pool.query(`
      UPDATE orders
      SET client_tracking_data =
        COALESCE(client_tracking_data, '{}'::jsonb) ||
        jsonb_build_object('cart_recovery_claimed_at', NOW())
      WHERE id = $1
        AND status = 'PENDING_PAYMENT'
        AND client_tracking_data->>'abandoned_cart_consent' = 'true'
        AND client_tracking_data->>'cart_recovery_email_sent_at' IS NULL
        AND (
          client_tracking_data->>'cart_recovery_claimed_at' IS NULL
          OR (client_tracking_data->>'cart_recovery_claimed_at')::timestamptz < NOW() - INTERVAL '30 minutes'
        )
      RETURNING id
    `, [order.id]);
    if (claim.rowCount !== 1) return;

    try {
      const customerName = order.first_name?.trim() || 'Cliente';
      const copy = await gemini.generateCartRecoveryCopy(
        customerName,
        order.items,
        Number(order.total_amount_local)
      );
      const frontendUrl = process.env.FRONTEND_URL || 'https://ravsstore.com';
      const recoveryUrl = new URL('/checkout', frontendUrl);
      recoveryUrl.searchParams.set('recover', order.recovery_token);

      const sent = await emailService.sendAbandonedCartEmail(
        order.email,
        customerName,
        copy.subject,
        copy.opening,
        order.items,
        Number(order.total_amount_local),
        recoveryUrl.toString()
      );
      if (!sent) throw new Error('El proveedor de correo no confirmó el envío.');

      await pool.query(`
        UPDATE orders
        SET client_tracking_data =
          (COALESCE(client_tracking_data, '{}'::jsonb) ||
           jsonb_build_object('cart_recovery_email_sent_at', NOW()))
          - 'cart_recovery_claimed_at'
        WHERE id = $1
      `, [order.id]);
    } catch (error) {
      await pool.query(`
        UPDATE orders
        SET client_tracking_data = COALESCE(client_tracking_data, '{}'::jsonb) - 'cart_recovery_claimed_at'
        WHERE id = $1
      `, [order.id]);
      console.error(`Error enviando recuperación de carrito para la orden ${order.id}:`, error);
    }
  }
}

export const aiAgentService = new AiAgentService();