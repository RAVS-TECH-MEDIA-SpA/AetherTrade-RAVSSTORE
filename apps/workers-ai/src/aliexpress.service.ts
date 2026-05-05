import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

export class AliExpressService {
  private apiKey: string = process.env.RAPID_API_KEY || '';
  private serperApiKey: string = process.env.SERPER_API_KEY || '';
  private readonly host = 'aliexpress-datahub.p.rapidapi.com';

  private fixUrl(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('//') ? `https:${url}` : url;
  }

  private async wait(): Promise<void> {
    const ms = Math.floor(Math.random() * 600) + 400; 
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // En AliExpressService.ts

async searchTrending(niche: string, country: string, maxPages: number = 1) {
    if (!this.apiKey) return [];
    
    let allRawItems: any[] = [];
    
    try {
      // Bucle de escaneo para aumentar el buffer de candidatos
      for (let p = 1; p <= maxPages; p++) {
        await this.wait();
        
        const options = {
          method: 'GET',
          url: `https://${this.host}/item_search_3`,
          params: { 
            q: niche, 
            page: String(p), // Dinámico: página 1, 2...
            region: country, 
            sort: 'salesDesc', 
            locale: 'en_US', 
            currency: 'USD' 
          },
          headers: { 'x-rapidapi-key': this.apiKey, 'x-rapidapi-host': this.host },
          timeout: 15000
        };

        console.log(`⏳ [PAGE ${p}] Escaneando buffer en RapidAPI: "${niche}"...`);
        const response = await axios.request(options);
        const pageItems = response.data?.result?.resultList || [];
        
        if (pageItems.length === 0) break; // Si no hay más resultados, salimos del bucle
        
        allRawItems = [...allRawItems, ...pageItems];
        
        // Si ya tenemos suficientes candidatos brutos, no gastamos más créditos de búsqueda
        if (allRawItems.length >= 40) break; 
      }

      console.log(`📦 Buffer Expandido: ${allRawItems.length} resultados brutos para "${niche}".`);

      return allRawItems.map((entry: any) => {
        const item = entry.item;
        return {
          aliexpress_id: item.itemId,
          title: item.title,
          price: parseFloat(item.sku?.def?.promotionPrice || item.sku?.def?.price || '0'),
          rating: item.averageStarRate ? parseFloat(item.averageStarRate) : 0,
          sales: item.sales || 0,
          url: this.fixUrl(item.itemUrl),
          imageUrl: this.fixUrl(item.image),
          freeShipping: item.delivery?.freeShipping === true
        };
      });
    } catch (error: any) {
      console.error(`🚨 ERROR EN SCANNER para "${niche}":`, error.response?.data || error.message);
      return []; 
    }
}

  async getItemDetail(itemId: string) {
    if (!this.apiKey) return null;
    try {
      await this.wait();
      const options = {
        method: 'GET',
        url: `https://${this.host}/item_detail_2`,
        params: { itemId },
        headers: { 'x-rapidapi-key': this.apiKey, 'x-rapidapi-host': this.host },
        timeout: 15000 // 🛡️ EL SALVAVIDAS: Si no responde en 15 segundos, corta y lanza error
      };

      const response = await axios.request(options);
      const data = response.data?.result;
      if (!data || !data.item) return null;

       // [CP-ALI-2] Verifica los datos profundos (Video, Stock)

      return {
        itemId: data.item.itemId,
        title: data.item.title,
        available: data.item.available,
        stock: data.item.sku?.def?.quantity || 0,
        images: (data.item.images || []).map((img: string) => this.fixUrl(img)),
        shippingFee: parseFloat(data.delivery?.shippingList?.[0]?.shippingFee || '0'),
        price: parseFloat(data.item.sku?.def?.promotionPrice || data.item.sku?.def?.price || '0'),
        videoUrl: this.fixUrl(data.item.mainVideo?.videoUrl || data.item.video?.videoUrl || null)
      };
    } catch (error: any) {
      console.error(`❌ Error RapidAPI Detail:`, error.message);
      return null;
    }
  }

  async findProductVideo(title: string): Promise<string | null> {
    if (!this.serperApiKey) return null;
    try {
      const response = await fetch('https://google.serper.dev/videos', {
        method: 'POST',
        headers: { 'X-API-KEY': this.serperApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `${title} review showcase product`, gl: 'us', num: 1 })
      });
      const data = await response.json();
      return data.videos?.[0]?.link || null;
    } catch (e) {
      return null;
    }
  }
}