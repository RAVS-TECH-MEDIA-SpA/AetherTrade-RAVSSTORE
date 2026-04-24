// apps/landing-next/src/lib/db.ts
import { Pool } from 'pg';

declare global {
  var pgPool: Pool | undefined;
}

const poolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 10, // Bajamos un poco el max para Vercel
  idleTimeoutMillis: 30000,
};

// Patrón Singleton para el pool en desarrollo/serverless
export const pool = global.pgPool || new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool;
}