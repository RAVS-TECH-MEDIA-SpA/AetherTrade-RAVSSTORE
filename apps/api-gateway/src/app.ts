import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes'; // El archivo que creamos arriba

const app = express();

app.use(cors());
app.use(express.json());

// IMPORTANTE: Si Angular pide /api/inventory, aquí lo capturamos
app.use('/api', dashboardRoutes); 

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API-Gateway corriendo en http://localhost:${PORT}`);
});

export default app;