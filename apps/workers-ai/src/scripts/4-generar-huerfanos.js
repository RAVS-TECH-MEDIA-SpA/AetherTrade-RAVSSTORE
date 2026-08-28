// scripts/4-generar-huerfanos.js
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

// 2. El JSON de los 32 productos huérfanos
const productosHuerfanos = [
  { "producto_id": "4e85464c-e85e-4b92-b771-b9998cbee781", "nombre_producto": "2in 1 Cat Food Dispenser Water and Food Integrated Fully Automatic Cat Food Feeding and Water Dispenser Cute Water Dispenser", "categoria": 3 },
  { "producto_id": "bf89fe08-9c71-4187-8844-dd1ee798a193", "nombre_producto": "USB Heated Gloves Touchscreen Rechargeable Thermal Thickened for Skiing Motorcycle Cycling Commuting Outdoor Winter Activities", "categoria": 2 },
  { "producto_id": "122c6fd6-21ff-4875-aedc-00a715dff88b", "nombre_producto": "USB Winter Electric Foot Heating Pad Under Desk Household Foot Warmer Heater Soft Plush Foot Warming Thermostat Mat Warm Pad", "categoria": 52 },
  { "producto_id": "e388642c-68d8-4239-911a-3384db918d6c", "nombre_producto": "Desktop Vacuum Cleaner Portable Wireless Mini Vacuum Cleaner Office Desk Dust Home Table Sweeper Desktop Cleaner", "categoria": 2 },
  { "producto_id": "208529bb-5c96-463d-a80a-d577781a267b", "nombre_producto": "Pet Food Measuring Scoop Electronic Dog Cat Food Measuring Cup Digital Spoon Scale Kitchen Food Scale with LED Display", "categoria": 35 },
  { "producto_id": "211b412b-1b4a-4429-8408-2825d7a5aebf", "nombre_producto": "Cabinet Light USB Rechargeable Motion Sensor Led Three Colors In One Lamp For Kitchen Wardrobe Indoor Lighting 10/20/30/40/50cm", "categoria": 20 },
  { "producto_id": "8e81a46f-06b3-4722-80b7-32d2fa31f78e", "nombre_producto": "Self-Heating Pet Pads Blanket Puppy Pad Warm Cushion Mat for Cats Dogs Washable Pets with Thermal Cats Dogs Bed", "categoria": 3 },
  { "producto_id": "225ed84f-3b44-439c-a741-e5c81d1cc1ce", "nombre_producto": "Reusable Pet Hair Removal Gloves Double Sided Beauty Gloves for Sofa Carpet Home Pet Fur Hair Removal Tool Pet Supplies", "categoria": 3 },
  { "producto_id": "cac878dc-6146-46eb-8f69-89d624beb723", "nombre_producto": "JSPTEC Airtag Bluetooth GPS Trackers IPX 5 Waterproof Sport Tracking Find My Elderly Kids Pets Available Mini Finders For IOS", "categoria": 2 },
  { "producto_id": "14e66fec-f7c8-4700-88f8-1e891b6dc33f", "nombre_producto": "USB Electric Heated Seat Cushion 4 Temperature Settings Winter Car Seat Heater Cold Resistant Chair Heated Mat for Office Travel", "categoria": 5 },
  { "producto_id": "2ccd0ec7-eafe-4d32-bb4c-3e6fc6108812", "nombre_producto": "HOMEFISH 2025 Handheld Desktop Vacuum Cleaner High Suction Portable Car Pencil Cleaner for Students New Model", "categoria": 2 },
  { "producto_id": "f8af78af-897c-473c-89b2-9d082d072b9c", "nombre_producto": "10000 Lux LED Daylight Lamp Intelligent Emotional Physiotherapy Lamp 3 Light Colours Brightness Adjustable LED Night Light", "categoria": 20 },
  { "producto_id": "55ffcae1-24e5-442a-8377-733d4c07419f", "nombre_producto": "Thermal-Activated Cable Sleeve Shrinkable Wire Protector Kit Insulation Tubes for DlY Proiects Automotive Electronics Repair", "categoria": 2 },
  { "producto_id": "575f2486-8536-48c1-9f2d-c2b16fb7878a", "nombre_producto": "Cat Water Fountain, 1.2L Recirculating Pet Water Dispenser, USB Powered, Silent, with Filter Foam for Cats and Small Dogs", "categoria": 19 },
  { "producto_id": "39395abe-47d6-4549-aa18-da411f21ecb7", "nombre_producto": "Bluetooth 5.4 Earphones IPX7 Waterproof 20Hrs Wireless Headphones with ENC Noise Cancelling Mic Deep Bass For Sports Workout Gym", "categoria": 2 },
  { "producto_id": "c848d449-9d89-4bdd-a6e5-f1636a9c699f", "nombre_producto": "Hot lifelike Bird Vivid Cat Toys Pet Catnip Simulation Molding Cat Teaser with Feather Soft Plush Fabric Toys for Kitten", "categoria": 3 },
  { "producto_id": "932f6cda-797b-4b32-b108-9d03708d1eda", "nombre_producto": "Anti-Fog Spray for Goggles, Glasses, Cameras, Windshields, Telescopes and Bathroom Mirrors, Long-Lasting Clear Vision Protection", "categoria": 9 },
  { "producto_id": "3f074c60-d264-4401-925f-be1416cda8e3", "nombre_producto": "Electronic Measuring Tool Dog and Cat Feeding Bowl Measuring Spoon Pet Food Scale Digital Display Weighing Spoon Weight Volumn", "categoria": 35 },
  { "producto_id": "31f41324-15be-4436-a82d-cbb1358467b8", "nombre_producto": "Electric Heating Pad Winter Warm For Bed Blankets Office Home Foot Hand Warmer Sheet Camping Heater 110V 220V Washable 60*30CM", "categoria": 5 },
  { "producto_id": "c30c8595-5cd0-45cd-a9f1-2051cdf157c2", "nombre_producto": "Smart Aroma Diffuser Air Purifier Digital Display Plant Essential Oils 5 Gears Wall Mount Tabletop USB Charging Living Room", "categoria": 5 },
  { "producto_id": "87493250-0798-4f21-a2f7-7a14d4d1ab0d", "nombre_producto": "Motorcycle Water Repellent Spray Anti Rain Coating For Car Glass Hydrophobic Anti-rain Car Liquid Windshield Mirror Polish Kit", "categoria": 8 },
  { "producto_id": "1adda354-6f19-46ab-ad15-c8772e44abb3", "nombre_producto": "LED Daylight Lamp 20000 Lux Cool & Warm Light Therapy Lamp Against Depression 3 Light Colours 5 Brightness Levels Touch Control", "categoria": 20 },
  { "producto_id": "4bd353bf-5084-453d-b86e-6b5c77929950", "nombre_producto": "Cat Water Fountain, 1.2L Recirculating Pet Water Dispenser, USB Powered, Silent, with Filter Foam for Cats and Small Dogs", "categoria": 19 },
  { "producto_id": "ca56da1f-d5aa-4fd8-9b2b-16f61e7d978d", "nombre_producto": "Wake Up Light Sunrise Alarm Clock White Noise Sound Machine Bluetooth Speaker Color Changing Night Lights for Bedroom Ideal Gift", "categoria": 2 },
  { "producto_id": "420b4d3c-00b6-466d-865c-fc7aaa066c9a", "nombre_producto": "WS2812B Led Lights DC5V WS2812 RGB Led Strip Light Individually Addressable Smart Pixels Magic Light Black White PCB IP30 65 67", "categoria": 2 },
  { "producto_id": "a4e3b9af-a7af-429d-a7cc-7da6a81cad95", "nombre_producto": "Multifunctional Solar Lamp Outdoor Garden Decoration Solar LED Light Waterproof Sunlight Powered Spotlight with Motion Sensor", "categoria": 1 },
  { "producto_id": "4860c3d1-dc8b-497d-aa69-dd305b63a0bc", "nombre_producto": "KZ EDX Pro Earphones Dynamic In Ear Monitor HiFi Wired Headphones Bass Stereo Game Music Earplugs Noice Cancelling Headset", "categoria": 2 },
  { "producto_id": "8792f07e-1b1f-41e7-9a20-12c82a02cde0", "nombre_producto": "Cat Tunnel Tube Foldable Cat Toys Kitty Training Interactive Fun Toy Tunnel Bored for Puppy Kitten Pet Supplies Cat Accessories", "categoria": 3 },
  { "producto_id": "0e6d99c8-6484-4de3-96f8-f0a549993dcb", "nombre_producto": "Household Small Dehumidifier for Home Portable Air Dry No Water Mist Mini Humidity Dehumidifiers for Bedroom with Auto Shut Off", "categoria": 5 },
  { "producto_id": "a5b239b8-7307-4183-baba-4cf7f08d6bd6", "nombre_producto": "Motion Sensor Light LED Sensor Lamp Wireless Ultra Thin USB LED For Kitchen Cabinet Bedroom Wardrobe Indoor Lighting Night Light", "categoria": 20 },
  { "producto_id": "71407e5a-e51e-48b1-a324-862a4e24a61a", "nombre_producto": "New Rose Quartz Jade Eye Mask Massager Tool Natural Jade Eye Relaxation Massage Stone Skin Massage Beauty Care Tool Gift", "categoria": 9 },
  { "producto_id": "2b1be8cc-2909-44cf-a108-e6c3d8b93a4a", "nombre_producto": "Cat Puzzle Toy Felt Puzzle Box Cat Exercise Toy With Ball Indoor Sports Entertainment Hunting Cat Toys For Indoor Cats", "categoria": 94 }
];

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
        metadata: { cacheControl: 'public, max-age=31536000' }
    });

    const urlPublica = `https://storage.googleapis.com/${bucketName}/${destino}`;
    console.log(`🔗 URL Pública: ${urlPublica}`);
    return urlPublica;
}

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
        
        console.log(`🚀 Iniciando producción en masa: ${productosHuerfanos.length} productos huérfanos en cola.`);

        for (const [index, producto] of productosHuerfanos.entries()) {
            console.log(`\n=================================================`);
            // Limpiamos un poco el nombre para que el título de la guía no sea excesivamente largo
            const nombreCorto = producto.nombre_producto.substring(0, 45).trim();
            const tituloGuia = `Manual Premium: Maximizando tu ${nombreCorto}`;
            
            console.log(`⚙️ PROCESANDO [${index + 1}/${productosHuerfanos.length}]: ${tituloGuia}`);
            
            const guia = {
                product_id: producto.producto_id,
                titulo: tituloGuia
            };
            
            // 1. Escribir texto e imágenes con Gemini
            const contenido = await redactarContenidoConIA(guia.titulo);
            if (!contenido || !contenido.capitulos) {
                console.log(`⚠️ Salto de guía por error de IA. Se reintentará en la próxima ejecución.`);
                continue;
            }

            // 2. Generar el PDF local
            const { rutaCompleta, nombreArchivoFisico } = await crearPDFPremium(guia, contenido);

            // 3. Subir a Google Cloud Storage
            const urlGCP = await subirGCP(rutaCompleta, nombreArchivoFisico);

            // 4. Actualizar o Insertar en la Base de Datos (Supabase)
            // Verificamos si el registro existe primero
            const checkRes = await client.query('SELECT id FROM guias_digitales WHERE product_id = $1', [guia.product_id]);
            
            if (checkRes.rows.length > 0) {
                await client.query(
                    `UPDATE guias_digitales SET titulo = $1, storage_url = $2 WHERE product_id = $3`, 
                    [guia.titulo, urlGCP, guia.product_id]
                );
                console.log(`💾 Base de datos ACTUALIZADA con éxito (el registro ya existía a medias).`);
            } else {
                await client.query(
                    `INSERT INTO guias_digitales (product_id, titulo, precio_clp, storage_url) VALUES ($1, $2, 2990, $3)`, 
                    [guia.product_id, guia.titulo, urlGCP]
                );
                console.log(`💾 Base de datos INSERTADA con éxito (producto 100% nuevo en la tabla).`);
            }

            // 5. Limpieza: Borrar el PDF local
            fs.unlinkSync(rutaCompleta);
            console.log(`🧹 Archivo local temporal eliminado.`);

            // Pausa de 3 segundos entre guías para cuidar la cuota de la API
            if (index < productosHuerfanos.length - 1) {
                console.log(`⏳ Esperando 3 segundos para el próximo producto...`);
                await esperar(3000);
            }
        }

        console.log(`\n✅ PROCESO DE PRODUCCIÓN FINALIZADO. Las 32 guías están operativas.`);

    } catch (error) {
        console.error("❌ Fallo crítico en la fábrica:", error);
    } finally {
        await client.end();
    }
}

iniciarFabrica();