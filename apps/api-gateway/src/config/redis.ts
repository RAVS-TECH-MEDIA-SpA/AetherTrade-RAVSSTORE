import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST || 'redis://127.0.0.1:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

redis.on('connect', () => console.log('✅ Redis conectado'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));