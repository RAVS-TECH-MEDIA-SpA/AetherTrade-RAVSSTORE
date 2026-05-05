import axios from 'axios';

export class SerperService {
  private apiKey = process.env.SERPER_API_KEY;

  // Búsqueda de imágenes de estilo de vida
  async getLifestyleImages(query: string): Promise<string[]> {
    if (!this.apiKey) return [];
    try {
      const cleanQuery = query.split(' ').slice(0, 4).join(' ');
      
      const response = await axios.post(
        'https://google.serper.dev/images',
        { q: `${cleanQuery} lifestyle high resolution product photography`, gl: 'us' },
        { headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' } }
      );
      return response.data.images?.slice(0, 4).map((img: any) => img.imageUrl) || [];
    } catch (error) {
      console.error('❌ Error en Serper (Images):', error);
      return [];
    }
  }

  // MEJORADO: Búsqueda de videos priorizando YouTube y YouTube Shorts
  async getPromotionalVideo(productTitle: string): Promise<string | null> {
    if (!this.apiKey) return null;
    
    // Paso 1: Sanitización quirúrgica (esencia del producto)
    const cleanTitle = productTitle.split(' ').slice(0, 6).join(' ');

    try {
      // Intento 1: Prioridad absoluta a YouTube Shorts (Formato ideal para Dashboard)
      const primaryQuery = `${cleanTitle} product showcase "shorts" site:youtube.com`;
      let videoLink = await this.executeVideoSearch(primaryQuery);

      // Paso 2: Fallback 1 - YouTube estándar (Reviews visuales o Demos)
      if (!videoLink) {
        const fallbackQuery = `${cleanTitle} official product demo site:youtube.com`;
        videoLink = await this.executeVideoSearch(fallbackQuery);
      }

      // Paso 3: Fallback 2 - Búsqueda abierta (TikTok/Instagram) solo si YouTube falla
      if (!videoLink) {
        const globalQuery = `${cleanTitle} product commercial ad`;
        videoLink = await this.executeVideoSearch(globalQuery);
      }

      return videoLink;
    } catch (error) {
      console.error('❌ Error en Serper (Video):', error);
      return null;
    }
  }

  // Helper privado para ejecución y filtrado de calidad
  private async executeVideoSearch(query: string): Promise<string | null> {
    try {
      const response = await axios.post(
        'https://google.serper.dev/videos',
        { q: query, gl: 'us', hl: 'en' },
        { headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' } }
      );

      const videos = response.data.videos || [];
      if (videos.length === 0) return null;

      // Filtro de calidad: Priorizamos YouTube y evitamos contenido "ruidoso"
      const bestVideo = videos.find((v: any) => {
        const url = v.link.toLowerCase();
        const title = v.title.toLowerCase();
        
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        const isNotTrash = !title.includes('review') && !title.includes('failed') && !title.includes('worst');
        
        return isYouTube && isNotTrash;
      });

      // Si no hay uno de YouTube perfecto, devolvemos el primero de la lista
      return bestVideo?.link || videos[0].link;
    } catch {
      return null;
    }
  }
}