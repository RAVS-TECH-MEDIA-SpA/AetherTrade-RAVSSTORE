// scripts/2-upload-guias-bd.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function subirGuias() {
    console.log("🚀 Iniciando carga de Guías Digitales a la Base de Datos...");
    
    // Ruta al JSON que acabamos de generar
    const filePath = path.resolve(__dirname, 'guias-por-producto.json');
    if (!fs.existsSync(filePath)) {
        console.error("❌ No se encontró el archivo guias-por-producto.json");
        return;
    }

    const guiasCrudas = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`📦 Leyendo ${guiasCrudas.length} guías del JSON...`);

    // Conexión directa a Supabase Postgres usando tus credenciales
    const client = new Client({
        host: 'aws-0-sa-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.orzlxytmboxaqjibpnwl',
        password: 'A9t7-HR4b!%ua+u',
        ssl: { rejectUnauthorized: false } // Requisito de Supabase
    });

    try {
        await client.connect();
        console.log("✅ Conexión establecida con éxito.");

        let insertadas = 0;

        for (const guia of guiasCrudas) {
            // Generamos una descripción corta estándar para la venta
            const descripcion_corta = "Aprende los secretos y maximiza tus resultados con esta guía práctica premium.";

            // Insertamos directamente en la tabla asegurando las asociaciones
            const query = `
                INSERT INTO guias_digitales (product_id, category_id, titulo, descripcion_corta, precio_clp)
                VALUES ($1, $2, $3, $4, $5)
            `;
            const values = [guia.product_id, guia.category_id, guia.titulo_guia, descripcion_corta, 4990];

            await client.query(query, values);
            insertadas++;
            
            // Un pequeño log visual para ver que avanza
            if (insertadas % 10 === 0) console.log(`   ⏳ Subidas ${insertadas}/${guiasCrudas.length}...`);
        }

        console.log(`\n🎉 ¡Éxito total! Se guardaron ${insertadas} guías en la tabla 'guias_digitales'.`);

    } catch (error) {
        console.error("❌ Error en la base de datos:", error);
    } finally {
        await client.end();
    }
}

subirGuias();