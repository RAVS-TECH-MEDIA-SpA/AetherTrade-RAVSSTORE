// apps/api-gateway/src/server.ts
import app from './app.js';



const port = process.env.PORT || 8080;

app.listen(Number(port), '0.0.0.0', () => {
   console.log(`
  🚀 Aether Trade API-Gateway lista
  📡 Escuchando en: http://localhost:${port}
  📍 Entorno: Cabrero, Biobío
  `);
});