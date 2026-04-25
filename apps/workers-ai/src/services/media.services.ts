import { Storage } from '@google-cloud/storage';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class MediaService {
  private storage: Storage;
  private bucketName = 'ravstore-media';

  constructor() {
    this.storage = new Storage({
      keyFilename: path.resolve(__dirname, '../../../../key.json')
    });
  }

  async downloadAndUploadImage(url: string, productId: string, index: number): Promise<string> {
    try {
      console.log(`  ⬇️ Descargando imagen ${index} de: ${url.substring(0, 50)}...`);
      
      const response = await axios.get(url, { 
  responseType: 'arraybuffer',
  timeout: 15000,
  headers: { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Accept-Language': 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
    'Cache-Control': 'no-cache'
  }
});

      const fileName = `products/${productId}/img-${index}.jpg`;
      const file = this.storage.bucket(this.bucketName).file(fileName);

      await file.save(response.data, {
        metadata: { contentType: 'image/jpeg' }
      });

      console.log(`  ✅ Subida a GCS: ${fileName}`);
      return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;

    } catch (error: any) {
      console.error(`  ❌ Error en descarga/subida de imagen ${index}:`, error.message);
      return ''; // Retornamos vacío si falla
    }
  }
}