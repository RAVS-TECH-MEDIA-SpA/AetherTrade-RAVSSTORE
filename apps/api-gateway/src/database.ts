import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  // Configuraciones de optimización para Senior
  max: 20, // Máximo de conexiones simultáneas
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 2000,
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

// Verificación de conexión al arranque
pool.on('connect', () => {
  console.log('Base de Datos: Conexión establecida con éxito');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Postgres', err);
  process.exit(-1);
});