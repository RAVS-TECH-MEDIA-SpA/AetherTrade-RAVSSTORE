import { Redis } from 'ioredis';

// Prioridad 1: Variables de GCP (Host/Port)
// Prioridad 2: URL completa (Local o Docker)
// Prioridad 3: Localhost por defecto
const redisConfig = process.env.REDIS_HOST 
  ? { 
      host: process.env.REDIS_HOST, 
      port: Number(process.env.REDIS_PORT) || 6379,
      connectTimeout: 10000 
    } 
  : (process.env.REDIS_URL || 'redis://127.0.0.1:6379');

console.log(`🔌 [REDIS_LOG]: Iniciando conexión hacia: ${typeof redisConfig === 'object' ? redisConfig.host : redisConfig}`);

export const redis = new Redis(redisConfig as any);

// Manejo de errores para que el proceso no explote si Redis se cae
redis.on('error', (err) => {
  console.error('❌ [REDIS_ERROR]:', err.message);
});

redis.on('connect', () => {
  console.log('✅ [REDIS]: Conectado exitosamente.');
});