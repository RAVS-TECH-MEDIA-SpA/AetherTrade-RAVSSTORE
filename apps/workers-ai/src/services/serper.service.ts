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

  /**
   * Obtiene el video promocional siguiendo la jerarquía:
   * 1. AliExpress Nativo (Máxima fidelidad)
   * 2. Serper / YouTube (Búsqueda refinada)
   */
async getPromotionalVideo(productTitle: string, aliVideoUrl?: string | null): Promise<string | null> {
    // PASO 1: PRIORIDAD ABSOLUTA - Video de AliExpress
    if (aliVideoUrl && aliVideoUrl.trim() !== "") {
      console.log('✅ Usando video nativo de AliExpress.');
      return aliVideoUrl;
    }

    if (!this.apiKey) return null;

    // PASO 2: SANITIZACIÓN QUIRÚRGICA
    // Eliminamos ruido SEO para que la búsqueda sea "limpia"
    const cleanTitle = this.cleanTitleForVideo(productTitle);
    
    try {
      console.log(`🔍 Video nativo no encontrado. Buscando en Serper para: "${cleanTitle}"`);

      /**
       * PASO 3: QUERY DE ALTA INTENCIÓN
       * Usamos operadores de búsqueda para evitar "basura" (reviews largas, noticias, tutoriales DIY).
       * Priorizamos Shorts porque el ratio de aspecto es ideal para Dashboards.
       */
      const primaryQuery = `"${cleanTitle}" product showcase shorts -review -unboxing`;
      let videoLink = await this.executeVideoSearch(primaryQuery);

      // FALLBACK 1: Demo oficial (Si no hay shorts)
      if (!videoLink) {
        const fallbackQuery = `official "${cleanTitle}" product feature demo -DIY -how-to`;
        videoLink = await this.executeVideoSearch(fallbackQuery);
      }

      return videoLink;
    } catch (error) {
      console.error('❌ Error en Serper (Video):', error);
      return null;
    }
  }

  /**
   * Limpia el título específicamente para búsquedas de video.
   * Evita que palabras como "Free Shipping" o "2024" arruinen el algoritmo.
   */
  private cleanTitleForVideo(title: string): string {
    return title
      .replace(/(202[0-9]|New|Global|Original|Official|AliExpress|Dropshipping|Free Shipping|tituloseo|titulo)/gi, '')
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 4) // Reducimos a 4 palabras clave para máxima precisión
      .join(' ')
      .trim();
  }

  /**
   * Ejecuta la llamada a Serper
   */
  private async executeVideoSearch(query: string): Promise<string | null> {

      try {
      const response = await axios.post(
        'https://google.serper.dev/videos',
        { q: query, gl: 'us', hl: 'en' },
        { headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' } }
      );

      // LOG DIAGNÓSTICO: Ver respuesta cruda de videos
      console.log(`🔍 [DEBUG SERPER VIDEO] Respuesta para query "${query}":`, JSON.stringify(response.data.videos?.slice(0, 2), null, 2));

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
    } catch (error) {
      console.error('❌ [DEBUG SERPER VIDEO] Error:', error);
      return null;
    }
  }
 
}