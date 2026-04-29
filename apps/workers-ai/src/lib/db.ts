import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}
// En producción (Cloud Run), DATABASE_URL siempre vendrá configurada.
const connectionString = process.env.DATABASE_URL;

// Configuración dinámica
const poolConfig = connectionString 
  ? { 
      connectionString,
      max: 10,
      ssl: false 
    } 
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST || '127.0.0.1',
      database: process.env.DB_NAME,
      // Cambiamos el fallback para detectar el error real
      password: process.env.DB_PASSWORD, 
      port: parseInt(process.env.DB_PORT || '5432'),
    };

// Validación de seguridad para local
if (!connectionString && !process.env.DB_PASSWORD) {
  console.error("❌ [DB_ERROR]: DB_PASSWORD no está definida en el entorno.");
}

console.log(`🔌 [DB_LOG]: ${connectionString ? 'CONECTANDO VÍA SOCKET (NUBE)' : 'CONECTANDO VÍA TCP (LOCAL)'}`);

export const pool = new Pool(poolConfig);