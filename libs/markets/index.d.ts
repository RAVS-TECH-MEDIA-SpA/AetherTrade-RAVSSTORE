export type MarketConfig = {
  code: string;
  name: string;
  currency: string;
  locale: string;
  hemisphere: 'north' | 'south';
  rolloutStage: 'active' | 'discovery' | 'candidate';
  enabled: boolean;
  discoveryEnabled: boolean;
  paymentProvider: 'mercadopago';
  providerStatus: 'current' | 'needs_validation';
};

export const MARKET_ROLLOUT: Record<string, MarketConfig>;
export function getMarketConfig(countryCode: string): MarketConfig | null;
export function getCheckoutMarket(countryCode: string): MarketConfig | null;
