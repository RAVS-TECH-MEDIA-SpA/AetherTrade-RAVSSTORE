import axios from 'axios';

export class SerperService {
  private apiKey = process.env.SERPER_API_KEY;

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

  async getPromotionalVideo(productTitle: string, aliVideoUrl?: string | null): Promise<string | null> {
    if (aliVideoUrl && aliVideoUrl.trim() !== "") {
      console.log('✅ Usando video nativo de AliExpress.');
      return aliVideoUrl;
    }

    if (!this.apiKey) return null;

    const cleanTitle = this.cleanTitleForVideo(productTitle);
    
    try {
      console.log(`🔍 Video nativo no encontrado. Buscando en Serper para: "${cleanTitle}"`);

      const primaryQuery = `"${cleanTitle}" product showcase shorts -review -unboxing`;
      let videoLink = await this.executeVideoSearch(primaryQuery);

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

  private cleanTitleForVideo(title: string): string {
    return title
      .replace(/(202[0-9]|New|Global|Original|Official|AliExpress|Dropshipping|Free Shipping|tituloseo|titulo)/gi, '')
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 4) 
      .join(' ')
      .trim();
  }

  // ⚡ EL FIX DE LOS VIDEOS NULL ESTÁ AQUÍ
  private async executeVideoSearch(query: string): Promise<string | null> {
    try {
      const response = await axios.post(
        'https://google.serper.dev/videos',
        { q: query, gl: 'us', hl: 'en' },
        { headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' } }
      );

      const videos = response.data.videos || [];
      
      console.log(`🔍 [DEBUG SERPER VIDEO] Resultados para "${query}": ${videos.length} encontrados.`);
      
      if (videos.length === 0) return null;

      // Buscamos de forma segura
      const bestVideo = videos.find((v: any) => {
        if (!v || !v.link || !v.title) return false;
        const url = v.link.toLowerCase();
        const title = v.title.toLowerCase();
        
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        const isNotTrash = !title.includes('review') && !title.includes('failed') && !title.includes('worst');
        
        return isYouTube && isNotTrash;
      });

      // ⚡ Evitamos el undefined de Array.find()
      const finalLink = bestVideo?.link || videos[0]?.link || null;
      
      if (finalLink) {
        console.log(`✅ [DEBUG SERPER VIDEO] URL Guardada: ${finalLink.substring(0,40)}...`);
      }
      return finalLink;
      
    } catch (error) {
      console.error('❌ [DEBUG SERPER VIDEO] Error de red:', error);
      return null;
    }
  }
}