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
      localisms: 'despacho gratis entrega', // ⚡ Quitado los paréntesis y OR
      keywords: 'precio comprar',
      sites: ['mercadolibre.cl', 'falabella.com', 'paris.cl', 'lider.cl', 'sodimac.cl'],
      minValidPrice: 2500
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
 // 2. Haz el limpiador más agresivo
  public cleanProductName(name: string): string {
    if (!name) return "";
    return name
      .replace(/(202[0-9]|New|Global|Original|Portable|Mini|Hot Sale|Stock|SKU|Piece|Lot)/gi, '')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, ' ') // ⚡ Cambiado a espacio en vez de vacío
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

    // Chile no usa decimales en el retail online, el regex debe ser estricto con los puntos de miles
    const priceRegex = country === 'CL' 
      ? /(?:\$|CLP)\s?([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{3,7})/i 
      : /(?:\$|USD|€|MXN)\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/i;

    const match = text.match(priceRegex);
    if (!match) return 0;

    let valueStr = match[1];

    if (country === 'CL') {
      valueStr = valueStr.replace(/\./g, ''); // En Chile el punto es separador de miles
    } else {
      valueStr = valueStr.replace(/,/g, ''); // En US/MX la coma es separador de miles
    }

    const price = parseFloat(valueStr);
    
    // Validamos contra el piso configurado en constants o el local
    const minPrice = MARKET_CONFIG[country as keyof typeof MARKET_CONFIG]?.MIN_PRICE || this.MARKET_MAP[country]?.minValidPrice || 0;
    return (price >= minPrice) ? price : 0;
  }

 private buildQuery(name: string, country: string): string {
    const config = this.MARKET_MAP[country.toUpperCase()] || this.MARKET_MAP['US'];
    const cleanName = this.cleanProductName(name);
    
    // ⚡ SIMPLIFICADO: En vez de un string gigante con OR, usamos una búsqueda limpia y directa.
    // Ejemplo: "Foco LED IP68 Exterior precio comprar chile -site:aliexpress.com"
    const countryName = country.toUpperCase() === 'CL' ? 'chile' : country.toUpperCase() === 'MX' ? 'mexico' : '';
    const exclusions = "-site:aliexpress.com -site:alibaba.com -site:temu.com";
    
    return `${cleanName} ${config.keywords} ${countryName} ${exclusions}`.trim();
  }

  async getCompetitorPrices(productName: string, country: string) {
    if (!this.apiKey) throw new Error('SERPER_API_KEY missing');
    
    const countryCode = country.toUpperCase();
    const query = this.buildQuery(productName, countryCode);

    try {
      const { data } = await axios.post('https://google.serper.dev/search', {
        q: query,
        gl: country.toLowerCase(),
        hl: countryCode === 'US' ? "en" : "es",
        autocorrect: true,
        num: 15 // Reducimos a 15 para mayor precisión y menor latencia
      }, {
        headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' }
      });

      const organic = data.organic || [];
      const shopping = data.shopping || [];
      const allResults = [...organic, ...shopping];
      
      return allResults
        .map((item: any) => {
          // Buscamos el precio en el snippet, título o el campo price de Google Shopping
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
        .sort((a, b) => a.price - b.price); // Ordenamos de más barato a más caro

    } catch (error: any) {
      console.error(`❌ Error en Serper (Competitors):`, error.message);
      return [];
    }
  }
}