// apps/api-gateway/src/server.ts
import app from './app';

const PORT = process.env.API_GATEWAY_PORT || 3001;

app.listen(PORT, () => {
  console.log(`
  🚀 Aether Trade API-Gateway lista
  📡 Escuchando en: http://localhost:${PORT}
  📍 Entorno: Cabrero, Biobío
  `);
});