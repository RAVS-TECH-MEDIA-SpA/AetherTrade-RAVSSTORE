// apps/api-gateway/src/app.ts
import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes.js';

const app = express();

// 1. Mueve el CORS al principio y permítelo todo en desarrollo
app.use(cors({
  origin: true, // Refleja el origin de la petición, útil para debuguear
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 2. Ruta de test rápido para descartar problemas de red
app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', cors: 'active' });
});

app.use('/api', dashboardRoutes);

// 3. Middleware de Error Global (CRUCIAL para mantener el CORS en fallos 500)
app.use((err: any, req: any, res: any, next: any) => {
  // Forzamos el header de CORS incluso si hay un crash
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  console.error("❌ Error en el Servidor:", err.stack);
  res.status(500).json({ error: err.message });
});

export default app;