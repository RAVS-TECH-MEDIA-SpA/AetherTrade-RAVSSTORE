export const MARKET_ROLLOUT = Object.freeze({
  CL: {
    code: 'CL',
    name: 'Chile',
    currency: 'CLP',
    locale: 'es-CL',
    hemisphere: 'south',
    rolloutStage: 'active',
    discoveryEnabled: true,
    enabled: true,
    paymentProvider: 'mercadopago',
    providerStatus: 'current'
  },
  MX: {
    code: 'MX',
    name: 'México',
    currency: 'MXN',
    locale: 'es-MX',
    hemisphere: 'north',
    rolloutStage: 'discovery',
    discoveryEnabled: false,
    enabled: false,
    paymentProvider: 'mercadopago',
    providerStatus: 'needs_validation'
  },
  UY: {
    code: 'UY',
    name: 'Uruguay',
    currency: 'UYU',
    locale: 'es-UY',
    hemisphere: 'south',
    rolloutStage: 'candidate',
    discoveryEnabled: false,
    enabled: false,
    paymentProvider: 'mercadopago',
    providerStatus: 'needs_validation'
  },
  PA: {
    code: 'PA',
    name: 'Panamá',
    currency: 'PAB',
    locale: 'es-PA',
    hemisphere: 'north',
    rolloutStage: 'candidate',
    discoveryEnabled: false,
    enabled: false,
    paymentProvider: 'mercadopago',
    providerStatus: 'needs_validation'
  },
  CR: {
    code: 'CR',
    name: 'Costa Rica',
    currency: 'CRC',
    locale: 'es-CR',
    hemisphere: 'north',
    rolloutStage: 'candidate',
    discoveryEnabled: false,
    enabled: false,
    paymentProvider: 'mercadopago',
    providerStatus: 'needs_validation'
  },
  BR: {
    code: 'BR',
    name: 'Brasil',
    currency: 'BRL',
    locale: 'pt-BR',
    hemisphere: 'south',
    rolloutStage: 'candidate',
    discoveryEnabled: false,
    enabled: false,
    paymentProvider: 'mercadopago',
    providerStatus: 'needs_validation'
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    currency: 'COP',
    locale: 'es-CO',
    hemisphere: 'north',
    rolloutStage: 'candidate',
    discoveryEnabled: false,
    enabled: false,
    paymentProvider: 'mercadopago',
    providerStatus: 'needs_validation'
  },
  PE: {
    code: 'PE',
    name: 'Perú',
    currency: 'PEN',
    locale: 'es-PE',
    hemisphere: 'south',
    rolloutStage: 'candidate',
    discoveryEnabled: false,
    enabled: false,
    paymentProvider: 'mercadopago',
    providerStatus: 'needs_validation'
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    currency: 'ARS',
    locale: 'es-AR',
    hemisphere: 'south',
    rolloutStage: 'candidate',
    discoveryEnabled: false,
    enabled: false,
    paymentProvider: 'mercadopago',
    providerStatus: 'needs_validation'
  }
});

export function getMarketConfig(countryCode) {
  const code = String(countryCode || '').trim().toUpperCase();
  return MARKET_ROLLOUT[code] || null;
}

export function getCheckoutMarket(countryCode) {
  const market = getMarketConfig(countryCode);
  return market?.enabled ? market : null;
}
