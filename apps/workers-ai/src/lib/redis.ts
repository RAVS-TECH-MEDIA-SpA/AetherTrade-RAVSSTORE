import { Redis } from 'ioredis';

// Priorizamos REDIS_URL. Usar "HOST" para una URL completa causa conflictos de parseo en Node.js
const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST || 'redis://127.0.0.1:6379';

console.log(`🔌 [REDIS_LOG]: Iniciando conexión hacia Redis/Upstash...`);

// Añadimos el bloque 'tls' para que Upstash (rediss://) no rechace la conexión
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000,
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
});

redis.on('error', (err) => {
  console.error('❌ [REDIS_ERROR]:', err.message);
});

redis.on('connect', () => {
  console.log('✅ [REDIS]: Conectado exitosamente.');
});