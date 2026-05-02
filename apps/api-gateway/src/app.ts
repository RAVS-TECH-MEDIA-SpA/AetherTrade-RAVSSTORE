// apps/api-gateway/src/app.ts
import express from 'express';
import cors from 'cors';
import router from './routes';

const app = express();

app.use(cors());
app.use(express.json());

// Montamos todas las rutas bajo /api
app.use('/api', router);

export default app;