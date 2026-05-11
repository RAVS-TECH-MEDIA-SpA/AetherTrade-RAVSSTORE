import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes'; // Asegúrate del .js si usas ESM


const app = express();


app.use(express.json());

app.use(cors({
  origin: ['http://localhost:3000', 'https://ravstore.vercel.app'], // Tus dominios
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Aquí capturamos todo lo que venga de la Landing o Angular
app.use('/api', dashboardRoutes); 

// NO llamar a app.listen aquí. Solo exportar.
export default app;