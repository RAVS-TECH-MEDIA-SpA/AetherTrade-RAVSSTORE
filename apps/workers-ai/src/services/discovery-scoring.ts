type Hemisphere = 'north' | 'south';

interface ProductSignals {
  title: string;
  niche: string;
  price: number;
  minPrice: number;
  maxPrice: number;
  sales?: number;
  rating?: number;
  stock?: number;
  country: string;
  hemisphere: Hemisphere;
  date?: Date;
}

const SEASONAL_TERMS: Record<string, string[]> = {
  spring: ['garden', 'outdoor', 'patio', 'cycling', 'pet', 'organizer'],
  summer: ['cooling', 'travel', 'camping', 'beach', 'outdoor', 'car'],
  autumn: ['storage', 'lighting', 'waterproof', 'automotive', 'home', 'desk'],
  winter: ['heating', 'indoor', 'humidifier', 'lighting', 'rain', 'car']
};

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function getMarketSeason(country: string, hemisphere?: Hemisphere, date = new Date()): string {
  const month = date.getUTCMonth() + 1;
  const isSouthern = hemisphere ? hemisphere === 'south' : country.toUpperCase() === 'CL';

  if (month >= 3 && month <= 5) return isSouthern ? 'autumn' : 'spring';
  if (month >= 6 && month <= 8) return isSouthern ? 'winter' : 'summer';
  if (month >= 9 && month <= 11) return isSouthern ? 'spring' : 'autumn';
  return isSouthern ? 'summer' : 'winter';
}

export function calculateDiscoveryScore(signals: ProductSignals): number {
  const normalizedTitle = normalize(signals.title);
  const nicheTerms = normalize(signals.niche).split(/\s+/).filter(Boolean);
  const titleTerms = new Set(normalizedTitle.split(/[^a-z0-9]+/).filter(Boolean));
  const overlap = nicheTerms.filter(term => titleTerms.has(term)).length;
  const relevanceScore = nicheTerms.length > 0 ? (overlap / nicheTerms.length) * 100 : 50;

  const pricePosition = (signals.price - signals.minPrice) / (signals.maxPrice - signals.minPrice);
  const priceScore = Math.max(0, 100 - Math.abs(pricePosition - 0.55) * 180);

  const season = getMarketSeason(signals.country, signals.hemisphere, signals.date);
  const seasonalTerms = SEASONAL_TERMS[season];
  const seasonalScore = seasonalTerms.some(term =>
    `${normalize(signals.niche)} ${normalizedTitle}`.includes(term)
  ) ? 100 : 50;

  const weightedSignals = [
    { score: priceScore, weight: 0.3 },
    { score: relevanceScore, weight: 0.3 },
    { score: seasonalScore, weight: 0.2 }
  ];

  if (Number.isFinite(signals.sales) && Number(signals.sales) > 0) {
    const salesScore = Math.min(100, Math.log10(Number(signals.sales) + 1) * 35);
    weightedSignals.push({ score: salesScore, weight: 0.1 });
  }
  if (Number.isFinite(signals.rating) && Number(signals.rating) > 0) {
    weightedSignals.push({ score: Math.min(100, (Number(signals.rating) / 5) * 100), weight: 0.1 });
  }
  if (Number.isFinite(signals.stock) && Number(signals.stock) > 0) {
    const stockScore = Math.min(100, (Number(signals.stock) / 100) * 100);
    weightedSignals.push({ score: stockScore, weight: 0.1 });
  }

  const totalWeight = weightedSignals.reduce((total, signal) => total + signal.weight, 0);
  const weightedScore = weightedSignals.reduce(
    (total, signal) => total + signal.score * signal.weight,
    0
  );
  return Number((weightedScore / totalWeight).toFixed(2));
}
