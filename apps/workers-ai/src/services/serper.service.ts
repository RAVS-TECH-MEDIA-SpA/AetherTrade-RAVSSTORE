import axios from 'axios';

export class SerperService {
  private apiKey = process.env.SERPER_API_KEY;

  async getLifestyleImages(query: string): Promise<string[]> {
    if (!this.apiKey) return [];
    try {
      const cleanQuery = query.split(' ').slice(0, 4).join(' ').replace(/["']/g, "").trim();
      
      const response = await axios.post(
        'https://google.serper.dev/images',
        { q: `${cleanQuery} high resolution product photography`, gl: 'us' },
        { headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' } }
      );
      return response.data.images?.slice(0, 4).map((img: any) => img.imageUrl) || [];
    } catch (error: any) {
      console.error('❌ Error en Serper (Images):', error.response?.data || error.message);
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

      const primaryQuery = `${cleanTitle} product showcase shorts -review -unboxing`.trim();
      let videoLink = await this.executeVideoSearch(primaryQuery);

      if (!videoLink) {
        const fallbackQuery = `official ${cleanTitle} product feature demo -DIY -how-to`.trim();
        videoLink = await this.executeVideoSearch(fallbackQuery);
      }

      return videoLink;
    } catch (error: any) {
      console.error('❌ Error en Serper (Video):', error.response?.data || error.message);
      return null;
    }
  }

  private cleanTitleForVideo(title: string): string {
    if (!title) return "product";
    return title
      .replace(/(202[0-9]|New|Global|Original|Official|AliExpress|Dropshipping|Free Shipping|tituloseo|titulo)/gi, '')
      .replace(/["']/g, "")
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 4) 
      .join(' ')
      .trim();
  }

  // ⚡ FIX: Búsqueda expandida a múltiples plataformas y URLs directas con sanitización robusta
  private async executeVideoSearch(query: string): Promise<string | null> {
    try {
      const sanitizedQuery = query.replace(/["']/g, "").trim();
      const response = await axios.post(
        'https://google.serper.dev/videos',
        { q: sanitizedQuery, gl: 'us', hl: 'en' },
        { headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' } }
      );

      const videos = response.data.videos || [];
      
      console.log(`🔍 [DEBUG SERPER VIDEO] Resultados para "${sanitizedQuery}": ${videos.length} encontrados.`);
      
      if (videos.length === 0) return null;

      const bestVideo = videos.find((v: any) => {
        if (!v || !v.link || !v.title) return false;
        const url = v.link.toLowerCase();
        const title = v.title.toLowerCase();
        
        // Ampliamos el espectro a plataformas de video compatibles o MP4 directo
        const isValidSource = url.includes('youtube.com') || 
                            url.includes('youtu.be') ||
                            url.includes('tiktok.com') ||
                            url.includes('vimeo.com') ||
                            url.includes('dailymotion.com') ||
                            url.includes('facebook.com/watch') ||
                            url.includes('instagram.com/reel') ||
                            url.endsWith('.mp4');

        const isNotTrash = !title.includes('review') && !title.includes('failed') && !title.includes('worst');
        
        return isValidSource && isNotTrash;
      });

      const finalLink = bestVideo?.link || videos[0]?.link || null;
      
      if (finalLink) {
        console.log(`✅ [DEBUG SERPER VIDEO] URL Guardada: ${finalLink.substring(0,40)}...`);
      }
      return finalLink;
      
    } catch (error: any) {
      console.error('❌ [DEBUG SERPER VIDEO] Error de red:', error.response?.data || error.message);
      return null;
    }
  }
}