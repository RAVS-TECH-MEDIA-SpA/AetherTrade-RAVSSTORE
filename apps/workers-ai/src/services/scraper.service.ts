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
      currency: '$', // Cambiado de CLP a $ para coincidir con los snippets de Líder/Facebook
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
  private cleanProductName(name: string): string {
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

 private buildQuery(name: string, country: string): string {
    const cleanName = name.split(' ').slice(0, 4).join(' ');
    const exclusions = "-site:aliexpress.com -site:amazon.com/cl";
    const currency = country === 'CL' ? '$' : 'USD';
    return `${cleanName} ${currency} "despacho gratis" ${exclusions}`;
  }

  private parsePrice(str: string, country: string): number {
    if (!str) return 0;
    let clean = str.replace(country === 'CL' ? /[^0-9.]/g : /[^0-9.,]/g, '');
    if (country === 'CL') clean = clean.replace(/\./g, '');
    const price = parseFloat(clean);
    return isNaN(price) ? 0 : price;
  }

  async getCompetitorPrices(productName: string, country: string) {
    if (!this.apiKey) throw new Error('SERPER_API_KEY missing');
    
    // Aquí usamos la lógica de query elástica que definimos antes
    const query = this.buildQuery(productName, country);
    

    try {
      const { data } = await axios.post('https://google.serper.dev/search', {
        q: query,
        gl: country.toLowerCase(),
        hl: country.toUpperCase() === 'US' ? "en" : "es",
        autocorrect: true,
        num: 20 
      }, {
        headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' }
      });

      // Procesamos resultados orgánicos y shopping
      const allResults = [...(data.organic || []), ...(data.shopping || [])];
      
      return allResults.map((item: any) => ({
        title: item.title,
         price: this.parsePrice(item.price || item.snippet || item.title, country.toUpperCase()),
        source: item.source || (item.link ? new URL(item.link).hostname : 'Google'),
        isSynthetic: false,
      })).filter(p => p.price > 0)

    } catch (error: any) {
      console.error(`❌ Error en Serper (Competitors):`, error.message);
      return [];
    }
  }
}