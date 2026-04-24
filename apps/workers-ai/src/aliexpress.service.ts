// apps/workers-ai/src/services/aliexpress.service.ts

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
          region: 'US', // Discovery Global
          sort: 'default',
          locale: 'en_US',
          currency: 'USD'
        },
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.host
        }
      };

      const response = await axios.request(options);
      
      // 1. Extraer la lista real (en V3 es resultList)
      const rawItems = response.data?.result.resultList || [];
      const totalResults = response.data?.result.resultList.length || 0;

      // 2. Mapeo Quirúrgico
      const mappedItems = rawItems.map((entry: any) => {
        const item = entry.item;
        const delivery = entry.delivery;

        return {
          aliexpress_id: item.itemId,
          title: item.title,
          // Prioridad: promotionPrice > price > 0
          price: parseFloat(item.sku?.def?.promotionPrice || item.sku?.def?.price || '0'),
          // Manejo de envío
          shipping_fee: delivery ? (delivery.freeShipping ? 0 : parseFloat(delivery.shippingFee || '0')) : 0,
          // El rating a veces es null en productos nuevos
          rating: item.averageStarRate ? parseFloat(item.averageStarRate) : 0,
          sales: item.sales || 0,
          // Limpiar la URL (añadir https:)
          url: item.itemUrl.startsWith('http') ? item.itemUrl : `https:${item.itemUrl}`,
          image: item.image.startsWith('http') ? item.image : `https:${item.image}`
        };
      });

      console.log(`\n🔎 [AliExpress API] Nicho: "${niche}"`);
      console.log(`📊 Encontrados: ${totalResults} | Mapeados con éxito: ${mappedItems.length}`);

      return mappedItems;

    } catch (error: any) {
      console.error(`❌ Error en RapidAPI [${niche}]:`, error.response?.data || error.message);
      return []; 
    }
  }
}