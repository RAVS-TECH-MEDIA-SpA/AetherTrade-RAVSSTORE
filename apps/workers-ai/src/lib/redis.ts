import { Redis } from 'ioredis';

// Tomamos la URL completa directamente. Funciona tanto para Upstash (rediss://) como local (redis://)
const redisUrl = process.env.REDIS_HOST || process.env.REDIS_URL || 'redis://127.0.0.1:6379';

console.log(`🔌 [REDIS_LOG]: Iniciando conexión hacia Redis/Upstash...`);

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  connectTimeout: 10000 
});

// Manejo de errores para que el proceso no explote si Redis se cae
redis.on('error', (err) => {
  console.error('❌ [REDIS_ERROR]:', err.message);
});

redis.on('connect', () => {
  console.log('✅ [REDIS]: Conectado exitosamente.');
});