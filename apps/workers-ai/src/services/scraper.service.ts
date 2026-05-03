import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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
  private readonly MARKET_MAP: Record<string, MarketConfig> = {
    'CL': {
      currency: '$', 
      localisms: '("despacho gratis" OR "entrega inmediata" OR "stock" OR "oferta")',
      keywords: 'precio comprar',
      sites: ['mercadolibre.cl', 'falabella.com', 'paris.cl', 'lider.cl', 'ripley.cl', 'sodimac.cl'],
      minValidPrice: 1500
    },
    'MX': {
      currency: '$', 
      localisms: '("envío gratis" OR "meses sin intereses" OR "entrega hoy")',
      keywords: 'precio comprar',
      sites: ['mercadolibre.com.mx', 'amazon.com.mx', 'walmart.com.mx', 'coppel.com', 'elektra.mx'],
      minValidPrice: 50
    },
    'ES': {
      currency: '€',
      localisms: '("envío 24h" OR "stock" OR "rebajas" OR "comprar")',
      keywords: 'precio comprar',
      sites: ['amazon.es', 'elcorteingles.es', 'pccomponentes.com', 'mediamarkt.es', 'carrefour.es'],
      minValidPrice: 5
    },
    'US': {
      currency: '$',
      localisms: '("free shipping" OR "in stock" OR "buy online")',
      keywords: 'buy price online',
      sites: ['amazon.com', 'walmart.com', 'target.com', 'ebay.com', 'bestbuy.com'],
      minValidPrice: 5
    }
  };

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY || '';
  }

  /**
   * Purifica el nombre del producto para evitar ruido en Google
   */
  public cleanProductName(name: string): string {
    if (!name) return "";
    return name
      .replace(/(202[0-9]|New|Global|Original|Portable|Mini|Hot Sale|Stock|SKU|Piece|Lot|Latest|High Quality|Professional|Official)/gi, '')
      .replace(/[0-9]+x[0-9]+/g, '')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚ ]/g, '')
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 4) 
      .join(' ')
      .trim();
  }

  /**
   * NUEVA LÓGICA: Extrae el precio de un texto usando Regex basado en el país
   */
  private parsePrice(text: string, country: string): number {
    if (!text) return 0;

    /**
     * Regex para Chile (CL): Busca '$' o 'CLP' seguido de números con puntos o comas
     * El patrón asegura que el número esté vinculado a una moneda.
     */
    const priceRegex = country === 'CL' 
      ? /(?:\$|CLP)\s?([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{2,6})/i 
      : /(?:\$|USD|€)\s?([0-9]{1,3}(?:[\.,][0-9]{3})*(?:[\.,][0-9]{2})?)/i;

    const match = text.match(priceRegex);
    if (!match) return 0;

    let valueStr = match[1];

    // Limpieza específica para Chile (eliminar puntos de miles)
    if (country === 'CL') {
      valueStr = valueStr.replace(/[\.,]/g, '');
    } else {
      valueStr = valueStr.replace(/,/g, ''); 
    }

    const price = parseFloat(valueStr);
    
    // Validación contra el precio mínimo del mercado configurado
    const config = this.MARKET_MAP[country] || { minValidPrice: 0 };
    return (price >= config.minValidPrice) ? price : 0;
  }

  /**
   * MEJORADO: Construye la query usando localismos y exclusiones
   */
  private buildQuery(name: string, country: string): string {
    const config = this.MARKET_MAP[country.toUpperCase()] || this.MARKET_MAP['US'];
    const cleanName = this.cleanProductName(name);
    const exclusions = "-site:aliexpress.com -site:amazon.com/cl";
    
    // Inyectamos la moneda y los localismos dinámicos del mapa
    return `${cleanName} ${config.currency} ${config.localisms} ${exclusions}`;
  }

  async getCompetitorPrices(productName: string, country: string) {
    if (!this.apiKey) throw new Error('SERPER_API_KEY missing');
    
    const query = this.buildQuery(productName, country);
    const countryCode = country.toUpperCase();

    try {
      const { data } = await axios.post('https://google.serper.dev/search', {
        q: query,
        gl: country.toLowerCase(),
        hl: countryCode === 'US' ? "en" : "es",
        autocorrect: true,
        num: 20 
      }, {
        headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' }
      });

      // Unificamos Orgánico y Shopping para ampliar la captura de precios
      const organic = data.organic || [];
      const shopping = data.shopping || [];
      const allResults = [...organic, ...shopping];
      
      return allResults
        .map((item: any) => {
          // Intentamos extraer el precio de múltiples campos donde Google suele volcar la data
          const rawText = `${item.price || ''} ${item.snippet || ''} ${item.title || ''}`;
          const price = this.parsePrice(rawText, countryCode);

          return {
            title: item.title,
            price: price,
            source: item.source || (item.link ? new URL(item.link).hostname : 'Google'),
            link: item.link,
            isSynthetic: false,
          };
        })
        .filter(p => p.price > 0); // Solo retornamos resultados con precios detectados

    } catch (error: any) {
      console.error(`❌ Error en Serper (Competitors):`, error.message);
      return [];
    }
  }
}