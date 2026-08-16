import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
// Importamos la configuración centralizada para mantener la "Single Source of Truth"
import { MARKET_CONFIG } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnvPath });

interface MarketConfig {
  keywords: string;
  sites: string[];
  currency: string;
  localisms: string;
  minValidPrice: number;
}

export class ScraperService {
  private apiKey: string;
  
  // Mapeo refinado para los mercados de Aether Trade
  private readonly MARKET_MAP: Record<string, MarketConfig> = {
    'CL': {
      currency: '$', 
      localisms: 'despacho gratis entrega',
      keywords: 'precio comprar',
      sites: ['mercadolibre.cl', 'falabella.com', 'paris.cl', 'lider.cl', 'sodimac.cl'],
      // ⚡ Aumentado a 3990 para ignorar accesorios diminutos, ventas "por metro" o errores.
      minValidPrice: 3990 
  },
    'MX': {
      currency: '$', 
      localisms: '("envío gratis" OR "meses sin intereses" OR "entrega hoy")',
      keywords: 'precio comprar',
      sites: ['mercadolibre.com.mx', 'amazon.com.mx', 'walmart.com.mx', 'coppel.com', 'elektra.mx'],
      minValidPrice: 150
    },
    'US': {
      currency: '$',
      localisms: '("free shipping" OR "in stock" OR "buy online")',
      keywords: 'buy price online',
      sites: ['amazon.com', 'walmart.com', 'target.com', 'ebay.com', 'bestbuy.com'],
      minValidPrice: 10
    }
  };

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY || '';
  }

  /**
   * Purifica el nombre para evitar que el ruido de AliExpress afecte el SEO en Google
   */
  public cleanProductName(name: string): string {
    if (!name) return "";
    return name
      .replace(/(202[0-9]|New|Global|Original|Portable|Mini|Hot Sale|Stock|SKU|Piece|Lot)/gi, '')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, ' ') 
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 4) 
      .join(' ')
      .trim();
  }

  /**
   * FIX: Extracción de precio robusta para CLP (sin decimales) y USD/MXN (con decimales)
   */
  private parsePrice(text: string, country: string): number {
    if (!text) return 0;

    console.log(`🔍 [DEBUG PARSEPRICE] Entrada original: "${text}"`);

    // ⚡ FIX: Nuevo filtro anti-dimensiones (ignora patrones como 123x23x62)
    const dimensionPattern = /\d+\s*[x×X]\s*\d+\s*[x×X]?\s*\d*/;
    if (dimensionPattern.test(text)) {
      console.log(`🚫 [DEBUG PARSEPRICE] Descartado por contener dimensiones: "${text.substring(0, 30)}..."`);
      return 0;
    }

    // ⚡ NUEVO FIX: Filtro anti-menús de tienda (ignora "hasta $10.000", rangos o descuentos)
    const storeMenuPattern = /(?:hasta\s*\$|desde\s*\$|\$\d+\s*\-\s*\$\d+|dcto|descuento|cuotas)/i;
    if (storeMenuPattern.test(text)) {
      console.log(`🚫 [DEBUG PARSEPRICE] Descartado por parecer un menú de filtros de tienda: "${text.substring(0, 40)}..."`);
      return 0;
    }

    // 3. ⚡ NUEVO: Filtro anti-packs (ignora "x2", "x3", "pack de 3", "3 piezas", "3 unidades")
    // Se asegura de ignorar combos para no comparar 1 unidad tuya contra 3 de la competencia.
    const multipackPattern = /(?:x\s*[2-9]|pack\s*(?:de)?\s*[2-9]|[2-9]\s*(?:piezas|unidades|pares|pz|uds))/i;
    if (multipackPattern.test(text)) {
      console.log(`🚫 [DEBUG PARSEPRICE] Descartado por ser un multipack (combo de varias unidades): "${text.substring(0, 40)}..."`);
      return 0;
    }

    // ⚡ FIX COMAS: El regex de Chile ahora admite tanto puntos (\.) como comas (,) en los miles.
    // ⚡ FIX: Añadido requerimiento de símbolo de moneda para evitar falsos positivos
    const priceRegex = country === 'CL' 
      ? /(?:\$|CLP)\s?([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{3,7})/i 
      : /(?:\$|USD|€|MXN)\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i;

    const match = text.match(priceRegex);
    
    console.log(`🔍 [DEBUG PARSEPRICE] Regex match para ${country}:`, match ? match[1] : "NO MATCH");

    if (!match) return 0;

    let valueStr = match[1];

    if (country === 'CL') {
      // ⚡ FIX LIMPIEZA: Removemos tanto puntos como comas para obtener el entero final puro.
      valueStr = valueStr.replace(/[\.,]/g, ''); 
    } else {
      valueStr = valueStr.replace(/,/g, ''); 
    }

    const price = parseFloat(valueStr);
    
    console.log(`🔍 [DEBUG PARSEPRICE] Valor convertido: ${price}`);

    // ⚡ FIX BUG DE MONEDAS: Usamos EXCLUSIVAMENTE el minValidPrice de este archivo (que está en moneda local).
    const minPrice = this.MARKET_MAP[country]?.minValidPrice || 0;
    
    if (price < minPrice) {
       console.log(`⚠️ [DEBUG PARSEPRICE] Precio descartado (${price}) por ser menor al piso local configurado (${minPrice}).`);
       return 0;
    }

    return price;
  }

 private buildQuery(name: string, country: string): string {
    const config = this.MARKET_MAP[country.toUpperCase()] || this.MARKET_MAP['US'];
    const cleanName = this.cleanProductName(name);
    
    const countryName = country.toUpperCase() === 'CL' ? 'chile' : country.toUpperCase() === 'MX' ? 'mexico' : '';
    const exclusions = "-site:aliexpress.com -site:alibaba.com -site:temu.com";
    
    const finalQuery = `${cleanName} ${config.keywords} ${countryName} ${exclusions}`.trim();
    
    console.log(`🔍 [DEBUG BUILDQUERY] Query generada: "${finalQuery}"`);
    
    return finalQuery;
  }

  async getCompetitorPrices(productName: string, country: string) {
    if (!this.apiKey) throw new Error('SERPER_API_KEY missing');
    
    const countryCode = country.toUpperCase();
    const query = this.buildQuery(productName, countryCode);

    try {
      const { data } = await axios.post('https://google.serper.dev/search', {
        q: query,
        gl: country.toLowerCase().trim(),
        hl: countryCode === 'US' ? "en" : "es",
        // ⚡ EXPANSIÓN DE UNIVERSO: Le pedimos 40 resultados en lugar de los 10 por defecto
        num: 40, 
        // Forzamos a que traiga siempre el módulo de Shopping de Google si existe
        autocorrect: true
      }, {
        headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' }
      });

      console.log(`🔍 [DEBUG SERPER SEARCH] Resultados para "${query}":`, JSON.stringify(data.shopping?.slice(0, 2), null, 2));

      const organic = data.organic || [];
      const shopping = data.shopping || [];
      const allResults = [...organic, ...shopping];
      
      return allResults
        .map((item: any) => {
          // ⚡ MEJORA: Priorizamos el precio oficial de Google Shopping si está disponible
          if (item.price) {
            const price = this.parsePrice(`${item.price} $`, countryCode);
            if (price > 0) {
              return { title: item.title, price, source: item.source || 'Shopping', link: item.link, isSynthetic: false };
            }
          }

          // Si no, recurrimos al método original de parsear el snippet
          const rawText = `${item.price || ''} ${item.snippet || ''} ${item.title || ''}`;
          const price = this.parsePrice(rawText, countryCode);

          return {
            title: item.title,
            price: price,
            source: item.source || (item.link ? new URL(item.link).hostname : 'Market'),
            link: item.link,
            isSynthetic: false,
          };
        })
        .filter(p => p.price > 0)
        .sort((a, b) => a.price - b.price); 

    } catch (error: any) {
      console.error(`❌ Error en Serper (Competitors):`, error.message);
      return [];
    }
  }
}