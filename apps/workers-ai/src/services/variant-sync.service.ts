// apps/workers-ai/src/services/variant-sync.service.ts
import { pool } from '../lib/db.js';

export async function syncVariantsFromAliExpress(productId: string, rawDetails: any) {
  const skuData = rawDetails.sku;
  if (!skuData || !skuData.props) return;

  // 1. Mapeo de IDs a nombres (Color: Rojo, Size: XL)
  const propsMap = new Map();
  skuData.props.forEach((prop: any) => {
    prop.values.forEach((val: any) => {
      propsMap.set(`${prop.pid}:${val.vid}`, { 
        name: prop.name, 
        value: val.name,
        image: val.image 
      });
    });
  });

  // 2. Procesar cada combinación (SKU Base)
  for (const base of skuData.base) {
    const paths = base.propPath.split(';');
    let color = null;
    let size = null;
    let imageUrl = null;

    paths.forEach((path: string) => {
      const info = propsMap.get(path);
      if (info) {
        // ID 14 suele ser Color, ID 5 Talla en AliExpress
        if (path.startsWith('14:') || info.name.toLowerCase().includes('color')) {
          color = info.value;
          imageUrl = info.image;
        } else {
          size = info.value;
        }
      }
    });

    // 3. Upsert: Si existe el SKU lo actualiza, si no, lo crea.
    await pool.query(`
      INSERT INTO product_variants (
        product_id, ali_sku_id, color, size, stock, additional_cost_usd, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (ali_sku_id) DO UPDATE SET
        color = EXCLUDED.color,
        size = EXCLUDED.size,
        stock = EXCLUDED.stock,
        additional_cost_usd = EXCLUDED.additional_cost_usd,
        image_url = COALESCE(EXCLUDED.image_url, product_variants.image_url),
        updated_at = NOW();
    `, [
      productId, 
      base.skuId, 
      color, 
      size, 
      base.quantity || 0, 
      parseFloat(base.price) || 0, 
      imageUrl
    ]);
  }
}