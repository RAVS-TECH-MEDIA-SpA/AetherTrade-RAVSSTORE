import axios from 'axios';

export class ScraperService {
  private apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  private cx = process.env.GOOGLE_SEARCH_CX;

  async getCompetitorPrices(productName: string) {
    const url = `https://www.googleapis.com/customsearch/v1`;
    
    try {
      const response = await axios.get(url, {
        params: {
          key: this.apiKey,
          cx: this.cx,
          q: `${productName} precio euro`,
          num: 5 // Traemos los 5 mejores resultados
        }
      });

      // Mapeamos los resultados para que Gemini los analice
      return response.data.items?.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        // Intentamos extraer el precio del snippet con una regex básica 
        // antes de pasárselo a la IA para refinamiento
        priceHint: item.snippet.match(/(\d+[\.,]\d{2})\s*€/)?.[1] || 'No detectado'
      })) || [];
    } catch (error) {
      console.error('Error en Google Search API:', error);
      return [];
    }
  }
}