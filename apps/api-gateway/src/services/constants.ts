// src/config/constants.ts

export const GLOBAL_MARKUP = 1.8;

export const MARKET_CONFIG = {
  CL: {
    name: 'Chile',
    currency: 'CLP',
    language: 'Spanish',
    hemisphere: 'south',
    MIN_NET_MARGIN_LOCAL: 5000,
    MIN_CPA_LOCAL: 1800,
    MIN_PRICE: 1.5,
    MIN_SALES: 15,          // Bajamos de 35 para captar productos nuevos con potencial
    MAX_SHIPPING: 18.0,     // Aumentamos el límite de envío para absorber costos de AliExpress
    MAX_PRICE: 95.00,       // Subimos el techo para permitir productos de ticket medio
    MIN_RATING: 3.8,        // Más flexible con la validación social (antes 4.0)
    LAST_MILE_BUFFER: 2.80, // Mantenemos el costo estimado de entrega local
    SAFETY_MARGIN: 2.00     // Margen neto mínimo reducido para evitar el bloqueo del CFO
},
  // Para escalar, solo añades más códigos de país aquí
  MX: {
    name: 'Mexico',
    currency: 'MXN',
    language: 'Spanish',
    hemisphere: 'north',
    MIN_NET_MARGIN_LOCAL: 250,
    MIN_CPA_LOCAL: 250,
    MIN_PRICE: 1.50,
    MIN_SALES: 50,
    MAX_SHIPPING: 6.00,
    MAX_PRICE: 50.00,
    MIN_RATING: 4.5,
    LAST_MILE_BUFFER: 3.50,
    SAFETY_MARGIN: 5.00
  }
} as const;