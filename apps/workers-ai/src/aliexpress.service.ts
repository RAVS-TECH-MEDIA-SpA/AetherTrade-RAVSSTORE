import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

export class AliExpressService {
  private apiKey: string;
  private readonly host = 'aliexpress-datahub.p.rapidapi.com';

  constructor() {
    this.apiKey = process.env.RAPID_API_KEY || '';
  }

  /**
   * PASO 1: Búsqueda de tendencias (Filtro superficial)
   * Gasta créditos por búsqueda (no por producto individual).
   */
  async searchTrending(niche: string, country: string) {
    if (!this.apiKey) {
      console.error('❌ AliExpressService: RAPID_API_KEY no encontrada.');
      return [];
    }

    try {
      const options = {
        method: 'GET',
        url: `https://${this.host}/item_search_3`,
        params: {
          q: niche,
          page: '1',
          region: country, // Ahora dinámico por mercado
          sort: 'salesDesc', // Priorizamos ventas desde el origen
          locale: 'en_US',
          currency: 'USD'
        },
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.host
        }
      };

      const response = await axios.request(options);
      const rawItems = response.data?.result?.resultList || [];

      return rawItems.map((entry: any) => {
        const item = entry.item;
        return {
          aliexpress_id: item.itemId,
          title: item.title,
          price: parseFloat(item.sku?.def?.promotionPrice || item.sku?.def?.price || '0'),
          rating: item.averageStarRate ? parseFloat(item.averageStarRate) : 0,
          sales: item.sales || 0,
          url: item.itemUrl.startsWith('http') ? item.itemUrl : `https:${item.itemUrl}`,
          image: item.image.startsWith('http') ? item.image : `https:${item.image}`
        };
      });

    } catch (error: any) {
      console.error(`❌ Error en RapidAPI [Search - ${niche}]:`, error.message);
      return []; 
    }
  }

  /**
   * PASO 2: Detalle profundo (Filtro quirúrgico)
   * Gasta 1 CRÉDITO por producto. Solo se usa con potenciales ganadores.
   */
  async getItemDetail(itemId: string) {
    try {
      const options = {
        method: 'GET',
        url: `https://${this.host}/item_detail_2`,
        params: { itemId },
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.host
        }
      };

      const response = await axios.request(options);
      const data = response.data?.result;

      if (!data || !data.item) return null;

      return {
        itemId: data.item.itemId,
        title: data.item.title, //
        available: data.item.available,
        stock: data.item.sku?.def?.quantity || 0,
        images: data.item.images || [],
        shippingFee: parseFloat(data.delivery?.shippingList?.[0]?.shippingFee || '0'),
        price: parseFloat(data.item.sku?.def?.promotionPrice || data.item.sku?.def?.price || '0')
      };
    } catch (error: any) {
      console.error(`❌ Error en RapidAPI [Detail - ${itemId}]:`, error.message);
      return null;
    }
  }
}