// src/config/constants.ts

export const GLOBAL_MARKUP = 1.8;

export const MARKET_CONFIG = {
  CL: {
    MIN_PRICE: 1.0,
    MIN_SALES: 5,         // Bajado drásticamente a 5 para atrapar productos nuevos sin historial masivo
    MAX_SHIPPING: 25.0,   // Margen holgado por si AliExpress infla el costo de envío aéreo
    MAX_PRICE: 70.00,     // Techo más alto para captar tecnología de mayor valor
    MIN_RATING: 3.0,      // Muy flexible con las valoraciones para pruebas
    LAST_MILE_BUFFER: 2.80, 
    SAFETY_MARGIN: 3.50   // Margen mínimo reducido al límite para evitar bloqueos del CFO
  },
  // Para escalar, solo añades más códigos de país aquí
  MX: {
    MIN_PRICE: 1.50,
    MIN_SALES: 50,
    MAX_SHIPPING: 6.00,
    MAX_PRICE: 50.00,
    MIN_RATING: 4.5,
    LAST_MILE_BUFFER: 3.50,
    SAFETY_MARGIN: 5.00
  }
};