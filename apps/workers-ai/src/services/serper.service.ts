import axios from 'axios';

export class SerperService {
  private apiKey = process.env.SERPER_API_KEY;

  // Búsqueda de imágenes de estilo de vida
  async getLifestyleImages(query: string): Promise<string[]> {
    if (!this.apiKey) return [];
    try {
      const response = await axios.post(
        'https://google.serper.dev/images',
        { q: `${query} lifestyle high resolution`, gl: 'cl' },
        { headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' } }
      );
      return response.data.images?.slice(0, 4).map((img: any) => img.imageUrl) || [];
    } catch (error) {
      console.error('❌ Error en Serper (Images):', error);
      return [];
    }
  }

  // NUEVO: Búsqueda de videos promocionales (Filtra críticas/reviews)
  async getPromotionalVideo(productTitle: string): Promise<string | null> {
    if (!this.apiKey) return null;
    try {
    
      // Lógica que debes tener en el backend (Serper)
      const query = `${productTitle} official product showcase ad -review -critica -opinión -unboxing -test -failed`;
      const response = await axios.post(
        'https://google.serper.dev/videos',
        { q: query, gl: 'us', hl: 'en' }, // 'us' suele tener mejores fuentes comerciales
        { headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' } }
      );

      const videos = response.data.videos || [];
      
      // Doble filtro: Buscamos un video cuyo título no contenga palabras prohibidas
      const adVideo = videos.find((v: any) => {
        const title = v.title.toLowerCase();
        return !title.includes('review') && !title.includes('critica') && !title.includes('test');
      });

      return adVideo?.link || (videos.length > 0 ? videos[0].link : null);
    } catch (error) {
      console.error('❌ Error en Serper (Video):', error);
      return null;
    }
  }
}