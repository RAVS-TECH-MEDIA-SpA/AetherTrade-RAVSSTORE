// src/lib/pricing.ts
import { MARKET_CONFIG, GLOBAL_MARKUP } from '../config/constants.js';

/**
 * Calcula el precio de venta final agnóstico al mercado seleccionado.
 */
export function calculateSuggestedPrice(baseCost: number, shippingCost: number, country: string = 'CL'): number {
  // Solución al error de tipado: cast a keyof typeof MARKET_CONFIG
  const marketKey = country as keyof typeof MARKET_CONFIG;
  const config = MARKET_CONFIG[marketKey] || MARKET_CONFIG.CL;
  
  const totalLanded = baseCost + shippingCost;
  
  // Lógica: (Costo Total * Multiplicador) + Margen de Seguridad - Absorción local
  const price = (totalLanded * GLOBAL_MARKUP) + config.SAFETY_MARGIN - config.LAST_MILE_BUFFER;

  return Math.round(price * 100) / 100;
}