import { Pool } from 'pg';
import dotenv from 'dotenv';
import { pool } from '../../../apps/workers-ai/src/lib/db.js'; // Reutilizamos la conexión del worker para evitar múltiples pools

dotenv.config();



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