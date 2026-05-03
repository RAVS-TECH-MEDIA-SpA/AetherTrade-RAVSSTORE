import { Pool } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

// 1. Configuración del path al .env global
// src (0) -> api-gateway (1) -> apps (2) -> AETHER-TRADE (3)
const envPath = path.resolve(__dirname, '../../../.env');

// 2. Carga de variables de entorno
dotenv.config({ path: envPath });

console.log(`🏠 [Database] Cargando configuración desde: ${envPath}`);

/**
 * Configuración del Pool para el API Gateway
 * Usamos Pool en lugar de Client para manejar múltiples peticiones del Dashboard
 */
export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  max: 10, // Máximo de conexiones simultáneas
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