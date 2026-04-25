import axios from 'axios';

export class SerperService {
  private apiKey = process.env.SERPER_API_KEY;

  async getLifestyleImages(query: string): Promise<string[]> {
    if (!this.apiKey) return [];
    try {
      const response = await axios.post(
        'https://google.serper.dev/images',
        { q: `${query} lifestyle high resolution`, gl: 'cl' },
        { headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' } }
      );
      return response.data.images.slice(0, 4).map((img: any) => img.imageUrl);
    } catch (error) {
      console.error('❌ Error en Serper:', error);
      return [];
    }
  }
}