// apps/api-gateway/src/server.ts
import app from './app';
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  🚀 Aether Trade API-Gateway lista
  📡 Escuchando en el puerto ${PORT}
  📍 Entorno: Cabrero, Biobío
  `);
});