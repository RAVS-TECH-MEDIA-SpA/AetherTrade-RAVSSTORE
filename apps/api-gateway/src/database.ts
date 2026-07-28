import { Pool, PoolConfig } from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// 1. Recrear __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Configuración del path al .env global
const envPath = path.resolve(__dirname, '../../../.env');

// 3. Carga de variables locales (Docker Compose ignorará esto a favor de sus propias variables)
dotenv.config({ path: envPath });

console.log(`🏠 [Database] Ruta de entorno evaluada: ${envPath}`);

/**
 * Configuración del Pool para el API Gateway
 * Prioriza DATABASE_URL de Docker. Si no existe, hace fallback a las variables del .env local.
 */
const poolConfig: PoolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 5432,
    };

export const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000,
});

// Verificación de conexión
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('🚨 [Database] Error de conexión a PostgreSQL:', err.message);
  } else {
    console.log('✅ [Database] Gateway conectado a PostgreSQL exitosamente');
  }
});