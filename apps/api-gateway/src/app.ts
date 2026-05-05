import express from 'express';
import cors from 'cors';
import dashboardRoutes from './routes'; // Asegúrate del .js si usas ESM

const app = express();

app.use(cors());
app.use(express.json());

// Aquí capturamos todo lo que venga de la Landing o Angular
app.use('/api', dashboardRoutes); 

// NO llamar a app.listen aquí. Solo exportar.
export default app;