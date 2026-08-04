import crypto from 'crypto';
import axios from 'axios';

// Función para hashear datos sensibles como exige Meta (SHA-256)
export const hashData = (data: string | undefined): string | undefined => {
  if (!data) return undefined;
  return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
};

export class MetaCapiService {
  private pixelId = process.env.FB_PIXEL_ID;
  private accessToken = process.env.FB_ACCESS_TOKEN;
  private testEventCode = process.env.FB_TEST_EVENT_CODE; // Útil para depurar en Commerce Manager

  /**
   * Envía un evento de conversión (ej. Purchase) a la API de Meta
   */
  async sendCapiEvent(payload: {
    eventName: string;
    eventId: string;
    email?: string;
    phone?: string;
    fbc?: string;
    fbp?: string;
    ipAddress?: string;
    userAgent?: string;
    totalAmountLocal: number;
    contentIds: string[];
    eventSourceUrl: string;
  }) {
    if (!this.pixelId || !this.accessToken) {
      console.warn('⚠️ [Meta CAPI] Credenciales no configuradas. Abortando evento.');
      return;
    }

    const eventData = {
      data: [
        {
          event_name: payload.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_id: payload.eventId, // Clave para la deduplicación con el Frontend
          event_source_url: payload.eventSourceUrl,
          user_data: {
            em: payload.email ? [hashData(payload.email)] : [],
            ph: payload.phone ? [hashData(payload.phone)] : [],
            client_ip_address: payload.ipAddress,
            client_user_agent: payload.userAgent,
            fbc: payload.fbc,
            fbp: payload.fbp,
          },
          custom_data: {
            value: payload.totalAmountLocal,
            currency: 'CLP',
            content_ids: payload.contentIds,
            content_type: 'product',
          },
        },
      ],
      ...(this.testEventCode && { test_event_code: this.testEventCode }),
    };

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v19.0/${this.pixelId}/events`,
        eventData,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ [Meta CAPI] Evento ${payload.eventName} enviado. ID: ${payload.eventId}. Res:`, response.data);
    } catch (error: any) {
      console.error(`❌ [Meta CAPI] Error enviando evento ${payload.eventName}:`, error.response?.data || error.message);
      throw error; // Lanzamos el error para que Pub/Sub reintente si es necesario
    }
  }
}