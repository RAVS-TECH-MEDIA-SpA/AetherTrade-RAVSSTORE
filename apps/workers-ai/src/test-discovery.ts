import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

if (process.env.NODE_ENV !== 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Subimos 4 niveles para llegar desde src/workers/ hasta la raíz del monorepo
  dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
}
import { runDiscoveryTask } from './workers/discovery.worker.js';
import { pool } from './lib/db.js';

async function test() {
  console.log("🧪 Iniciando test local de descubrimiento...");
  await runDiscoveryTask();
  console.log("🏁 Test finalizado.");
  process.exit(0);
}
test();