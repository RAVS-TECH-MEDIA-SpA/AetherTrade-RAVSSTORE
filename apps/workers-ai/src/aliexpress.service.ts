import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}

// Interfaces para mantener el orden de Senior
export interface AliProductBase {
  aliexpress_id: string;
  title: string;
  price: number;
  rating: number;
  sales: number;
  url: string;
  imageUrl: string;
  freeShipping: boolean;
}

export interface AliVariant {
  sku_id: string;
  props: string;
  price: string | number;
  stock: number;
  image?: string;
}

// ⚡ INTERFAZ ACTUALIZADA CON LOGÍSTICA Y CONFIANZA
export interface AliProductDetail {
  sku: any;
  aliexpress_id: string;
  title: string;
  price: number;
  rating: number;
  sales: number;
  url: string;
  imageUrl: string;
  images: string[];
  freeShipping: boolean;
  category_id: string;
  supplier_id: string;
  store_name: string;
  available: boolean;
  stock: number;
  videoUrl: string | null;
  shippingFee: number;
  variants: any[];
  properties: { name: string; value: string }[]; 
  extended_text?: string;
  
  // Nuevos campos integrados
  logistics: {
    weight: number;
    dimensions: { l: number; w: number; h: number };
    shippingType: string;
  };
  delivery: {
    estimateDate: string | null;
    isFree: boolean;
    shippingFee: number;
  };
  trust: {
    storeName: string;
    storeAge: string;
    isOfficial: boolean;
    buyerProtection: boolean;
  };
  categories: string[];
}

export class AliExpressService {
  private apiKey: string = process.env.RAPID_API_KEY || '';
  private serperApiKey: string = process.env.SERPER_API_KEY || '';
  private readonly host = 'aliexpress-datahub.p.rapidapi.com';

  private fixUrl(url: string | null): string | null {
    if (!url) return null;
    return url.startsWith('//') ? `https:${url}` : url;
  }

  private async wait(min = 1500, max = 3000): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, Math.max(ms, 1000)));
  }
 /**
   * FASE 1: Búsqueda (Discovery Worker)
   */
  async searchTrending(niche: string, country: string, maxPages: number = 1): Promise<AliProductBase[]> {
    if (!this.apiKey) return [];
    let allRawItems: any[] = [];
    
    try {
      for (let p = 1; p <= maxPages; p++) {
        await this.wait();
        const options = {
          method: 'GET',
          url: `https://${this.host}/item_search_3`,
          params: { 
            q: niche, 
            page: String(p), 
            region: country, 
            sort: 'salesDesc', 
            locale: 'en_US', 
            currency: 'USD' 
          },
          headers: { 'x-rapidapi-key': this.apiKey, 'x-rapidapi-host': this.host },
          timeout: 15000
        };

        console.log(`⏳ [SEARCH PAGE ${p}] Consultando RapidAPI: "${niche}"...`);
        const response = await axios.request(options);
        const pageItems = response.data?.result?.resultList || [];
        
        if (pageItems.length === 0) break;
        allRawItems = [...allRawItems, ...pageItems];
        if (allRawItems.length >= 40) break; 
      }

      return allRawItems.map((entry: any) => {
        const item = entry.item;
        
        // ⚡ FIX: Limpiamos el precio por si AliExpress envía un rango (ej: "10.99 - 25.00")
        const rawPrice = item.sku?.def?.promotionPrice || item.sku?.def?.price || '0';
        const cleanPrice = typeof rawPrice === 'string' && rawPrice.includes('-') 
          ? parseFloat(rawPrice.split('-')[0].trim()) 
          : parseFloat(rawPrice);

        return {
          aliexpress_id: item.itemId,
          title: item.title,
          price: cleanPrice,
          rating: item.averageStarRate ? parseFloat(item.averageStarRate) : 0,
          sales: item.sales || 0,
          url: this.fixUrl(item.itemUrl) || '',
          imageUrl: this.fixUrl(item.image) || '',
          freeShipping: item.delivery?.freeShipping === true
        };
      });
    } catch (error: any) {
      console.error(`🚨 ERROR EN SEARCH para "${niche}":`, error.message);
      return []; 
    }
  }

  /**
   * FASE 2: Detalle Profundo (Analysis Worker)
   */
  async getItemDetail(itemId: string): Promise<AliProductDetail | null> {
    if (!this.apiKey) return null;
    try {
      await this.wait();
      
      const options = {
        method: 'GET',
        url: `https://${this.host}/item_detail_2`,
        params: { itemId },
        headers: { 'x-rapidapi-key': this.apiKey, 'x-rapidapi-host': this.host },
        timeout: 15000
      };

      const response = await axios.request(options);
      const data = response.data?.result;
      
      if (!data || !data.item) {
        console.warn(`⚠️ [DETAIL] No se encontró info para ID: ${itemId}`);
        return null;
      }

      let extendedText = "";
      let extraProperties: { name: string; value: string }[] = [];
      let extraImages: string[] = [];

      try {
        const descOptions = {
          method: 'GET',
          url: `https://${this.host}/item_desc`,
          params: { itemId },
          headers: { 'x-rapidapi-key': this.apiKey, 'x-rapidapi-host': this.host },
          timeout: 10000
        };
        const descRes = await axios.request(descOptions);
        const descItem = descRes.data?.result?.item;

        if (descItem) {
          if (descItem.description?.text) {
            extendedText = descItem.description.text.join(' \n ').trim();
          }
          if (descItem.description?.images) {
            extraImages = descItem.description.images.map((img: string) => this.fixUrl(img) || '');
          }
          if (descItem.properties?.list) {
            extraProperties = descItem.properties.list.map((p: any) => ({
              name: p.name,
              value: p.value
            }));
          }
        }
      } catch (e) {
        console.log(`⚠️ [DETAIL] Sin descripción extendida para ID ${itemId}`);
      }

      // MAPEO FINAL DE LA DATA ESTRUCTURADA
      return {
        sku: data.item.sku,
        aliexpress_id: data.item.itemId,
        title: data.item.title,
        price: parseFloat(data.item.sku?.def?.promotionPrice || data.item.sku?.def?.price || '0'),
        rating: data.item.averageStarRate ? parseFloat(data.item.averageStarRate) : 0,
        sales: data.item.sales || 0,
        url: this.fixUrl(data.item.itemUrl) || '',
        imageUrl: this.fixUrl(data.item.images?.[0]) || '',
        
        images: data.item.images 
          ? [...data.item.images.map((img: string) => this.fixUrl(img)), ...extraImages].filter(Boolean)
          : extraImages.filter(Boolean),
          
        freeShipping: data.delivery?.freeShipping === true,
        category_id: data.item.catId ? String(data.item.catId) : 'UNCATEGORIZED',
        store_name: data.seller?.storeTitle || 'AliExpress Store',
        supplier_id: data.seller?.storeId ? String(data.seller.storeId) : 'UNKNOWN_STORE',
        available: data.item.available !== false,
        stock: data.item.sku?.def?.quantity || 0,
        videoUrl: data.item.videoUrl || null,
        shippingFee: parseFloat(data.delivery?.shippingFee || '0'),
        
        properties: extraProperties.length > 0 
          ? extraProperties 
          : (data.item.properties?.map((p: any) => ({ name: p.name, value: p.value })) || []), 
          
        variants: data.item.sku?.base || [],
        extended_text: extendedText,

        // 📦 LOGÍSTICA
        logistics: {
          weight: data.delivery?.packageDetail?.weight || 0,
          dimensions: {
            l: data.delivery?.packageDetail?.length || 0,
            w: data.delivery?.packageDetail?.width || 0,
            h: data.delivery?.packageDetail?.height || 0
          },
          shippingType: data.delivery?.shippingList?.[0]?.shippingCompany || 'Standard',
        },

        // 🚚 ENTREGA
        delivery: {
          estimateDate: data.delivery?.shippingList?.[0]?.estimateDeliveryDate || null,
          isFree: data.delivery?.freeShipping || false,
          shippingFee: parseFloat(data.delivery?.shippingList?.[0]?.shippingFee || '0')
        },

        // 🛡️ CONFIANZA
        trust: {
          storeName: data.seller?.storeTitle || 'AliExpress Store',
          storeAge: data.seller?.storeAge || 'N/A',
          isOfficial: data.seller?.storeTitle?.toLowerCase().includes('official'),
          buyerProtection: true 
        },

        // 🏷️ CATEGORIZACIÓN
        categories: data.item.breadcrumbs?.map((b: any) => b.title) || []
      };

    } catch (error: any) {
      console.error(`❌ Error RapidAPI Detail para ID ${itemId}:`, error.message);
      return null;
    }
  }

  /**
   * Búsqueda de video externo
   */
  async findProductVideo(title: string): Promise<string | null> {
    if (!this.serperApiKey) return null;
    try {
      const response = await fetch('https://google.serper.dev/videos', {
        method: 'POST',
        headers: { 'X-API-KEY': this.serperApiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: `${title} review showcase product`, gl: 'us', num: 1 })
      });
      const data = await response.json();
      return (data as any).videos?.[0]?.link || null;
    } catch (e) {
      return null;
    }
  }
}