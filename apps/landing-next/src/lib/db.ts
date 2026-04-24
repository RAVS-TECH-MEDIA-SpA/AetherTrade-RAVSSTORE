// apps/landing-next/src/lib/db.ts
import { Pool } from 'pg';

// Declaramos la interfaz para el objeto global en TypeScript
declare global {
  var pgPool: Pool | undefined;
}

const poolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  // Configuraciones recomendadas para producción
  max: 20, // Máximo de conexiones
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Si ya existe una instancia global (en desarrollo), la reutilizamos.
// Si no, la creamos. Esto evita el error de "Too many clients".
export const pool = global.pgPool || new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool;
}