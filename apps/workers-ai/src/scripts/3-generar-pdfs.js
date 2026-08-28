// scripts/3-generar-pdfs.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import PDFDocument from 'pdfkit';
import { VertexAI } from '@google-cloud/vertexai';
import { Storage } from '@google-cloud/storage';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Configuración de Credenciales Centralizadas (IA + Storage)
const credentialsPath = path.resolve(__dirname, '../../../../secrets/aether-gcp-credentials.json');
process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

const vertex_ai = new VertexAI({ project: 'aethertrade-core', location: 'us-central1' });
const model = vertex_ai.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
});

const storage = new Storage({ keyFilename: credentialsPath });
const bucketName = 'ravs-aethertrade-assets-prod';

async function redactarContenidoConIA(titulo) {
    console.log(`\n🧠 Solicitando a Gemini que escriba el libro: "${titulo}"...`);
    const prompt = `
    Eres un experto redactor de infoproductos premium.
    Escribe el contenido completo para una guía digital titulada: "${titulo}".
    
    Estructura obligatoria:
    1. Introducción (Gancho y promesa)
    2. Tres capítulos con consejos prácticos y accionables.
    3. Conclusión.
    
    Devuelve TODO estrictamente en este JSON:
    {
        "palabra_clave_imagen_en_ingles": "Ej: smart home technology / dog grooming (Máximo 3 palabras, en inglés)",
        "capitulos": [
            { "titulo_seccion": "Introducción", "texto": "contenido..." },
            { "titulo_seccion": "Capítulo 1: [Nombre]", "texto": "contenido..." }
        ]
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const textResult = result.response.candidates[0].content.parts[0].text;
        const cleanJson = textResult.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("❌ Error generando contenido con IA:", error.message);
        return null;
    }
}

async function obtenerImagenPortada(palabraClave) {
    console.log(`📸 Generando imagen para: "${palabraClave}"...`);
    try {
        const promptImagen = `minimalist aesthetic photography representing ${palabraClave}, dark mood, high quality, editorial style`;
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptImagen)}?width=600&height=400&nologo=true`;
        
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer); 
    } catch (error) {
        return null;
    }
}

function dibujarLogoRavs(doc, x, y) {
    doc.roundedRect(x, y, 32, 32, 8).fill('#7c3aed');
    const zapPath = "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z";
    doc.save();
    doc.translate(x + 4, y + 4); 
    doc.path(zapPath).fill('#ffffff');
    doc.restore();
    doc.fillColor('#ffffff')
       .font('Helvetica-BoldOblique')
       .fontSize(22)
       .text('RAVS', x + 42, y + 8, { continued: true })
       .fillColor('#8b5cf6')
       .text('STORE');
}

async function crearPDFPremium(guia, contenidoJSON) {
    return new Promise(async (resolve, reject) => {
        const dirPdfs = path.resolve(__dirname, 'pdfs');
        if (!fs.existsSync(dirPdfs)) fs.mkdirSync(dirPdfs);

        const nombreArchivoFisico = guia.titulo.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
        const rutaCompleta = path.join(dirPdfs, nombreArchivoFisico);

        const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
        const stream = fs.createWriteStream(rutaCompleta);
        doc.pipe(stream);

        const colorFondo = '#0f172a'; 
        const colorAcento = '#8b5cf6'; 

        // Portada
        const imgBuffer = await obtenerImagenPortada(contenidoJSON.palabra_clave_imagen_en_ingles);
        if (imgBuffer) {
            try {
                doc.image(imgBuffer, 0, 0, { width: doc.page.width, height: 400 });
                doc.rect(0, 400, doc.page.width, doc.page.height - 400).fill(colorFondo);
            } catch (e) {
                doc.rect(0, 0, doc.page.width, doc.page.height).fill(colorFondo);
            }
        } else {
            doc.rect(0, 0, doc.page.width, doc.page.height).fill(colorFondo);
        }
        
        dibujarLogoRavs(doc, 50, 40);

        doc.fillColor(colorAcento).fontSize(12).font('Helvetica-Bold').text('RAVSSTORE EXCLUSIVE', 65, 460, { characterSpacing: 2 });
        doc.fillColor('#ffffff').fontSize(32).font('Helvetica-Bold').text(guia.titulo, 65, 490, { width: 450, lineGap: 8 });
        doc.fillColor('#94a3b8').fontSize(14).font('Helvetica').text('Guía Práctica Definitiva para maximizar tus resultados.', 65, doc.page.height - 80);

        // Contenido
        contenidoJSON.capitulos.forEach((cap) => {
            let textoLimpio = (cap.texto || "").replace(/\*/g, '').replace(/\n{3,}/g, '\n\n').trim();
            textoLimpio = textoLimpio.replace(/^-\s/gm, '• ');

            if (textoLimpio.length > 10) {
                doc.addPage(); 
                const tituloLimpio = (cap.titulo_seccion || "").replace(/\*/g, '');
                doc.fillColor(colorAcento).fontSize(22).font('Helvetica-Bold').text(tituloLimpio);
                doc.moveDown(0.5);
                doc.moveTo(50, doc.y).lineTo(100, doc.y).strokeColor('#e2e8f0').lineWidth(2).stroke();
                doc.moveDown(1.5);
                doc.fillColor('#334155').fontSize(12).font('Helvetica').text(textoLimpio, { align: 'justify', lineGap: 5, paragraphGap: 12 });
            }
        });

        // Paginación
        const paginasTotales = doc.bufferedPageRange();
        for (let i = 1; i < paginasTotales.count; i++) { 
            doc.switchToPage(i); 
            const margenInferiorOriginal = doc.page.margins.bottom;
            doc.page.margins.bottom = 0;
            doc.fillColor('#94a3b8').fontSize(10).font('Helvetica').text(`Página ${i}`, 0, doc.page.height - 30, { width: doc.page.width, align: 'center', lineBreak: false });
            doc.page.margins.bottom = margenInferiorOriginal;
        }

        doc.flushPages(); 
        doc.end();

        stream.on('finish', () => {
            console.log(`✅ PDF físico generado exitosamente.`);
            resolve({ rutaCompleta, nombreArchivoFisico });
        });
        stream.on('error', reject);
    });
}

async function subirGCP(rutaLocal, nombreArchivo) {
    console.log(`☁️ Subiendo a Google Cloud Storage...`);
    const destino = `guias_digitales/${nombreArchivo}`;
    
    await storage.bucket(bucketName).upload(rutaLocal, {
        destination: destino,
        // Tu bucket ya tiene acceso público, pero esto asegura el archivo
        metadata: { cacheControl: 'public, max-age=31536000' }
    });

    const urlPublica = `https://storage.googleapis.com/${bucketName}/${destino}`;
    console.log(`🔗 URL Pública: ${urlPublica}`);
    return urlPublica;
}

// Para evitar bloqueos por cuotas de la IA, le damos un respiro entre guías
const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function iniciarFabrica() {
    const client = new Client({
        host: 'aws-0-sa-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.orzlxytmboxaqjibpnwl',
        password: 'A9t7-HR4b!%ua+u',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        // NOTA: Quitamos el LIMIT 1. Ahora procesará todo lo que no tenga PDF.
        const res = await client.query(`SELECT * FROM guias_digitales WHERE storage_url IS NULL`);
        
        if (res.rows.length === 0) {
            console.log("🎉 ¡Misión cumplida! Todas las guías de la base de datos están generadas y subidas.");
            return;
        }

        console.log(`🚀 Iniciando producción en masa: ${res.rows.length} guías en cola.`);

        for (const [index, guia] of res.rows.entries()) {
            console.log(`\n=================================================`);
            console.log(`⚙️ PROCESANDO [${index + 1}/${res.rows.length}]: ${guia.titulo}`);
            
            // 1. Escribir texto e imágenes
            const contenido = await redactarContenidoConIA(guia.titulo);
            if (!contenido || !contenido.capitulos) {
                console.log(`⚠️ Salto de guía por error de IA. Se reintentará en la próxima ejecución.`);
                continue;
            }

            // 2. Generar el PDF local
            const { rutaCompleta, nombreArchivoFisico } = await crearPDFPremium(guia, contenido);

            // 3. Subir a Google Cloud Storage
            const urlGCP = await subirGCP(rutaCompleta, nombreArchivoFisico);

            // 4. Actualizar Base de Datos en Supabase
            await client.query(`UPDATE guias_digitales SET storage_url = $1 WHERE product_id = $2`, [urlGCP, guia.product_id]);
            console.log(`💾 Base de datos actualizada con éxito.`);

            // 5. Limpieza: Borrar el PDF local para no saturar tu disco
            fs.unlinkSync(rutaCompleta);
            console.log(`🧹 Archivo local temporal eliminado.`);

            // Pausa de 3 segundos entre guías para cuidar la cuota de la API
            if (index < res.rows.length - 1) {
                console.log(`⏳ Esperando 3 segundos para el próximo producto...`);
                await esperar(3000);
            }
        }

        console.log(`\n✅ PROCESO DE PRODUCCIÓN FINALIZADO.`);

    } catch (error) {
        console.error("❌ Fallo crítico en la fábrica:", error);
    } finally {
        await client.end();
    }
}

iniciarFabrica();