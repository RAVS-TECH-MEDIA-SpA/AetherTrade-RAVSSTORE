// analisis-guias-existentes.js
import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. CONFIGURACIÓN DE RUTAS Y CREDENCIALES DIRECTAS (Sin .env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ⚡ Forzamos la ruta estricta al archivo JSON de credenciales
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(__dirname, '../../../../secrets/aether-gcp-credentials.json');

console.log("🔑 Usando credenciales GCP estrictamente en:", process.env.GOOGLE_APPLICATION_CREDENTIALS);

// 2. INICIALIZACIÓN DE VERTEX AI
const project_id = 'aethertrade-core'; 
const vertex_ai = new VertexAI({ project: project_id, location: 'us-central1' });
const model = vertex_ai.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.8 
    }
});

async function evaluarProducto(producto) {
    const titulo = producto.marketing_copy?.title_localized || producto.title_original;
    const categoria = producto.category?.name || producto.category_name || "General";
    
    const prompt = `
    Actúa como un estratega de e-commerce y copywriter creativo.
    Evalúa este producto físico (el título puede estar en inglés): "${titulo}"
    Categoría: "${categoria}"
    
    Tu objetivo es decidir si podemos inventar un "Libro Digital / Guía Práctica" en PDF para venderlo como complemento (up-sell) a $2.990 CLP.
    
    CRITERIOS (¡Usa tu creatividad publicitaria!):
    - Nicho Mascotas: CASI SIEMPRE ES VIABLE. (Ej: Si es un bebedero -> "Guía de prevención de enfermedades renales felinas". Si es un cepillo -> "Guía de peluquería canina en casa").
    - Nicho Salud/Belleza/Fitness: CASI SIEMPRE ES VIABLE. (Ej: "Rutina de 15 minutos", "Guía de alimentación anti-inflamatoria", "Secretos de postura perfecta").
    - Nicho Hogar/Cocina: Viable si facilita la vida (Ej: "Recetarios express", "Guías de organización minimalista").
    - Nicho Cables/Repuestos genéricos: NO ES VIABLE.
    
    REGLA ESTRICTA: Si es viable, el "titulo_guia_sugerido" DEBE estar en Español, sonar premium y prometer un atajo o solución rápida.
    
    Responde estrictamente en JSON usando esta estructura:
    {
      "es_viable": true o false,
      "titulo_guia_sugerido": "Guía Práctica: [Nombre persuasivo]" (o null si no es viable),
      "razon": "Por qué tomaste esta decisión (en español)"
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const textResult = result.response.candidates[0].content.parts[0].text;
        const cleanJson = textResult.replace(/```json|```/g, "").trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        return { es_viable: false, razon: `Error de IA: ${error.message}` };
    }
}

async function iniciar() {
    console.log("🚀 Obteniendo todos los productos de la BD...");
    
    try {
        // Usamos tu URL de producción directa
        const res = await fetch(`https://aethertrade-gateway-126152513656.southamerica-west1.run.app/api/inventory?status=WINNER&country=CL`);
        if (!res.ok) throw new Error('No se pudo conectar a la API');
        const productos = await res.json();
        
        console.log(`✅ Analizando ${productos.length} productos uno por uno...\n`);
        const guiasAprobadas = [];

        for (let i = 0; i < productos.length; i++) {
            const prod = productos[i];
            console.log(`\n[${i+1}/${productos.length}] Evaluando: ${prod.title_original.substring(0, 45)}...`);
            
            const evaluacion = await evaluarProducto(prod);
            
            if (evaluacion.es_viable) {
                console.log(`   ✨ APROBADO: ${evaluacion.titulo_guia_sugerido}`);
                console.log(`   💡 Razón: ${evaluacion.razon}`);
                guiasAprobadas.push({
                    product_id: prod.id,
                    category_id: prod.category_id,
                    titulo_producto: prod.title_original,
                    titulo_guia: evaluacion.titulo_guia_sugerido
                });
            } else {
                console.log(`   ❌ Descartado: ${evaluacion.razon}`);
            }
            
            await new Promise(r => setTimeout(r, 1500)); 
        }

        fs.writeFileSync('guias-por-producto.json', JSON.stringify(guiasAprobadas, null, 2));
        console.log(`\n🎉 ¡Escaneo completado exitosamente!`);
        console.log(`📂 Se encontraron ${guiasAprobadas.length} guías potenciales.`);
        
    } catch (error) {
        console.error("❌ Fallo crítico en el escaneo:", error.message);
    }
}

iniciar();