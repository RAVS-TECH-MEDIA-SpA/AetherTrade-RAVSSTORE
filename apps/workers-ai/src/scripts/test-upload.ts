import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function testUpload() {
  try {
    const storage = new Storage({
      keyFilename: path.resolve(__dirname, '../../../../key.json')
    });
    
    const bucketName = 'ravstore-media'; // <--- DEBE SER ESTE
    const bucket = storage.bucket(bucketName);
    const file = bucket.file('test-cabrero.txt');

    console.log(`⏳ Intentando subir archivo a ${bucketName}...`);
    
    await file.save('Hola desde Cabrero!', {
      metadata: { contentType: 'text/plain' },
    });

    console.log('✅ ¡SUBIDA EXITOSA! Revisa la consola de Google Cloud ahora.');
  } catch (error: any) {
    console.error('❌ ERROR FATAL:', error.message);
    console.error('Revisa si tu key.json pertenece al proyecto Ravstore-Scraper-Prod');
  }
}

testUpload();