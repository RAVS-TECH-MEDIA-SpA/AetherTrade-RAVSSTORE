import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../../.env');
dotenv.config({ path: rootEnvPath });

export class ScraperService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY || '';
  }

  private cleanProductName(name: string): string {
    if (!name) return "";
    return name
      .replace(/(202[0-9]|New|Global|Original|Portable|Mini|Hot Sale|Stock|SKU|Piece|Lot|Latest|High Quality|Professional)/gi, '')
      .replace(/[0-9]+x[0-9]+/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 5) // RECORTE A 5 PALABRAS
      .join(' ')
      .trim();
  }

  private parsePrice(priceStr: string, isChile: boolean): number {
    if (!priceStr) return 0;
    let clean = priceStr.replace(/[^0-9.,]/g, '');
    if (isChile) clean = clean.split(',')[0].replace(/\./g, '');
    else clean = clean.replace(/,/g, '.');
    const finalPrice = parseFloat(clean);
    return isNaN(finalPrice) ? 0 : finalPrice;
  }

  async getCompetitorPrices(productName: string, country: string) {
    if (!this.apiKey) throw new Error('SERPER_API_KEY missing');

    const MARKET_COMPETITORS: Record<string, { keywords: string, sites: string[] }> = {
      'CL': {
        keywords: 'precio comprar',
        sites: ['mercadolibre.cl', 'falabella.com', 'paris.cl', 'lider.cl', 'ripley.cl']
      },
      'MX': {
        keywords: 'precio comprar',
        sites: ['mercadolibre.com.mx', 'amazon.com.mx', 'walmart.com.mx', 'coppel.com']
      },
      'ES': {
        keywords: 'precio comprar',
        sites: ['amazon.es', 'elcorteingles.es', 'pccomponentes.com', 'mediamarkt.es']
      },
      'US': {
        keywords: 'buy price online',
        sites: ['amazon.com', 'walmart.com', 'target.com', 'ebay.com']
      }
    };

    const isChile = country.toUpperCase() === 'CL';
    const cleanName = this.cleanProductName(productName);
    
    // Búsqueda estricta en retailers locales (o genérica por país)
    const market = MARKET_COMPETITORS[country];

    // 🛡️ BARRERA 1: Palabras clave negativas en la Query a Google Serper
    const negativeKeywords = "-internacional -importado -exterior -global";
    let query = "";

    if (market && market.sites.length > 0) {
      const siteFilters = market.sites.map(site => `site:${site}`).join(' OR ');
      query = `"${cleanName}" ${market.keywords} -site:aliexpress.com -site:alibaba.com ${negativeKeywords} (${siteFilters})`;
    } else {
      query = `"${cleanName}" comprar precio ${country} -site:aliexpress.com -site:alibaba.com ${negativeKeywords}`;
    }

    try {
      const { data } = await axios.post('https://google.serper.dev/search', {
        q: query, gl: country.toLowerCase(), hl: "es", autocorrect: true, num: 10
      }, {
        headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' }
      });

      const results = data.organic || [];

      // 🛡️ BARRERA 2: Filtro estricto post-scraping en código
      const blockedTerms = ['internacional', 'importado', 'envío desde el exterior', 'compra internacional', 'envío internacional'];
      
      const localResults = results.filter((item: any) => {
        const contentToCheck = `${item.title} ${item.snippet}`.toLowerCase();
        const isInternational = blockedTerms.some(term => contentToCheck.includes(term.toLowerCase()));
        return !isInternational; // Retorna true solo si NO contiene los términos prohibidos
      });

      const products = localResults.map((item: any) => {
        let rawPrice = item.attributes?.Price || item.richSnippet?.shopping?.lowPrice || null;
        if (!rawPrice) {
          const currencyRegex = isChile 
            ? /(?:\$|CLP)\s?(\d{1,3}(?:\.\d{3})+)/i 
            : /(\d+(?:[.,]\d{1,2})?)\s*(?:€|EUR)/i;
          
          const match = item.snippet?.match(currencyRegex) || item.title?.match(currencyRegex);
          rawPrice = match ? match[0] : null;
        }

        return {
          title: item.title,
          link: item.link,
          price: this.parsePrice(rawPrice, isChile),
          source: new URL(item.link).hostname
        };
      });

      // Filtro de ruido: Menos de $1000 CLP suele ser un cable o accesorio falso, no el producto principal
      const validProducts = products.filter((p: any) => p.price > 1000);
      return validProducts;

    } catch (error: any) {
      console.error('❌ Error Scraper Serper:', error.message);
      return [];
    }
  }
}