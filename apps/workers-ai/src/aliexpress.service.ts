import axios from 'axios';

export class AliExpressService {
  private apiKey = process.env.RAPID_API_KEY;
  private host = 'aliexpress-datahub.p.rapidapi.com';

  async searchProduct(keywords: string) {
    const options = {
      method: 'GET',
      url: `https://${this.host}/item_search`,
      params: { q: keywords, page: '1', sort: 'NEWEST' },
      headers: { 'X-RapidAPI-Key': this.apiKey, 'X-RapidAPI-Host': this.host }
    };
    const response = await axios.request(options);
    return response.data.result.item; // Retorna los items para que Gemini elija el mejor
  }
}