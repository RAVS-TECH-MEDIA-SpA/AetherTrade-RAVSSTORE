import pg from 'pg';
const { Pool } = pg;

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const poolConfig = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL,
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST || '127.0.0.1',
      database: process.env.DB_NAME,
      password: String(process.env.DB_PASSWORD || ''),
      port: parseInt(process.env.DB_PORT || '5432'),
    };

const globalForPg = global as unknown as { pgPool: pg.Pool };

export const pool = globalForPg.pgPool || new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

console.log(`🔌 [DB_BRIDGE]: ${process.env.DATABASE_URL ? 'Conectando vía Socket de Unix (GCP)' : 'Conectando vía TCP/IP (Local)'}`);