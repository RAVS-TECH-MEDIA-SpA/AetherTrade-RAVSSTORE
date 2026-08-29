// src/config/constants.ts

export const GLOBAL_MARKUP = 1.8;

export const MARKET_CONFIG = {
 CL: {
    MIN_PRICE: 1.0,
    MIN_SALES: 5,         
    MAX_SHIPPING: 25.0,   
    MAX_PRICE: 70.00,     
    MIN_RATING: 3.0,      
    LAST_MILE_BUFFER: 2.80, 
    SAFETY_MARGIN: 2.50   // ⚡ Ajustado de 3.50 a 2.50 para flexibilizar el filtro de CJ Dropshipping
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