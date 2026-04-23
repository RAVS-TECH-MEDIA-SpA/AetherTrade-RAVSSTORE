export class FilterService {
  private static readonly BLACKLIST_KEYWORDS = [
    'liquid', 'battery', 'flammable', 'knife', 'powder', 
    'seeds', 'weapon', 'replica', 'fake', 'adult'
  ];

  static isProductTrash(item: any): boolean {
    const title = item.title.toLowerCase();
    
    // 1. Filtro de Categorías/Keywords Prohibidas
    const hasForbiddenKeyword = this.BLACKLIST_KEYWORDS.some(word => title.includes(word));
    if (hasForbiddenKeyword) return true;

    // 2. Filtro de Calidad Técnica
    if (parseFloat(item.evaluate_rate) < 4.5) return true;
    if (parseInt(item.sales_count) < 100) return true; // Evitamos productos sin prueba social
    
    // 3. Filtro de Confianza del Vendedor
    // Si la API lo permite, aquí filtraríamos por rating de tienda < 90%
    
    return false;
  }
}