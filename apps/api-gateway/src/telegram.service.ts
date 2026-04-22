import axios from 'axios';

export class TelegramService {
  private token = process.env.TELEGRAM_TOKEN;
  private chatId = process.env.TELEGRAM_CHAT_ID;
  private baseUrl = `https://api.telegram.org/bot${this.token}/sendMessage`;

  async send(message: string) {
    try {
      await axios.post(this.baseUrl, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error('Error enviando notificación a Telegram:', error);
    }
  }

  // Notificación formateada para "Winners"
  async notifyWinner(product: any, analysis: any) {
    const msg = `
🔥 <b>¡NUEVO WINNER DETECTADO!</b>
📦 Producto: ${product.title}
💰 Costo Ali: $${product.price}
🎯 Sugerido: ${analysis.suggestedPrice} EUR
📈 Margen Est.: ${((analysis.suggestedPrice / 1.08 - product.price) / product.price * 100).toFixed(2)}%
🌍 Mercado: ${analysis.market}
    `;
    await this.send(msg);
  }
}