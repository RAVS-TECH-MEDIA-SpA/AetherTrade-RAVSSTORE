import { MARKET_ROLLOUT } from '@aether/markets';

export const ACTIVE_MARKETS = [
  ...Object.values(MARKET_ROLLOUT)
    .filter(market => market.discoveryEnabled)
    .map(({ code, currency, name }) => ({ code, currency, name, region: 'LATAM' }))
];