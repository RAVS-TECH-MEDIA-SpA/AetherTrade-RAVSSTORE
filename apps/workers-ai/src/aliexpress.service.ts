import axios from 'axios';


export class AliExpressService {
  private readonly apiKey = process.env.RAPID_API_KEY;
  private readonly host = 'aliexpress-datahub.p.rapidapi.com';

  /**
   * Busca productos tendencia con filtros estrictos de calidad y logística.
   */
  // async searchTrending(category: string, country: string) {
  //   // Reglas de negocio por región
  //   const isChile = country === 'CL';
  //   const currency = isChile ? 'CLP' : 'EUR';
  //   const deliveryDays = isChile ? '15' : '7'; // Ajuste realista para Chile

  //   const options = {
  //     method: 'GET',
  //     url: `https://${this.host}/item_search`,
  //     params: {
  //       q: category,
  //       page: '1',
  //       sort: 'total_sales',      // Priorizar volumen de ventas
  //       min_price: '5',           // Evitar productos de muy baja calidad
  //       max_price: '50',          // Límite para compra por impulso
  //       delivery_days: deliveryDays,
  //       region: country,          // 'CL' o 'ES'
  //       currency: currency,
  //       locale: 'es_ES'           // Para que los títulos vengan más limpios
  //     },
  //     headers: {
  //       'X-RapidAPI-Key': this.apiKey,
  //       'X-RapidAPI-Host': this.host
  //     }
  //   };

  //   try {
  //     console.log(`📡 Llamando a RapidAPI para [${category}] en ${country}...`);
  //     const response = await axios.request(options);
      
  //     // La API de Datahub estructura los resultados en result.item
  //     return response.data?.result?.item || [];
  //   } catch (error: any) {
  //     console.error(`❌ Error en RapidAPI (AliExpress):`, error.response?.data || error.message);
  //     return []; // Devolvemos array vacío para no romper el flujo del worker
  //   }
  // }

  async searchTrending(niche: string, country: string) {
  try {
    const options = {
      method: 'GET',
      url: 'https://aliexpress-datahub.p.rapidapi.com/item_search',
      params: {
        q: niche,
        page: '1',
        region: country, // Asegúrate de que esto sea CL, ES, etc.
        sort: 'total_sales'
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY,
        'X-RapidAPI-Host': 'aliexpress-datahub.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    
    // 🔍 LOG DE DIAGNÓSTICO SENIOR
    console.log(`DEBUG RapidAPI [${niche}]:`, {
      status: response.status,
      totalResult: response.data?.total_result || 0,
      hasData: !!response.data?.result?.item
    });

    // OJO AQUÍ: Verifica si tu API usa .result.item o .data.items
    return response.data?.result?.item || []; 

  } catch (error: any) {
    console.error('❌ Error en AliExpress Service:', error.message);
    return [];
  }
}
}