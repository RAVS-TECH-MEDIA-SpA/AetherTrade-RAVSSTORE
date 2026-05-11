// api-gateway/src/products/product-sync.service.ts
import {pool} from '../database';

export const syncVariantsFromRaw = async (productId: string, rawDetails: any) => {
  const skuData = rawDetails.sku;
  if (!skuData || !skuData.props) return;

  const propsMap = new Map();
  skuData.props.forEach((prop: any) => {
    prop.values.forEach((val: any) => {
      propsMap.set(`${prop.pid}:${val.vid}`, { name: prop.name, value: val.name });
    });
  });

  for (const base of skuData.base) {
    const paths = base.propPath.split(';');
    let color = null, size = null;

    paths.forEach((path: string) => {
      const info = propsMap.get(path);
      if (info) {
        if (path.startsWith('14:')) color = info.value;
        else size = info.value;
      }
    });

    await pool.query(`
      INSERT INTO product_variants (product_id, ali_sku_id, color, size, stock, additional_cost_usd)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (ali_sku_id) DO UPDATE SET 
        color = EXCLUDED.color, 
        size = EXCLUDED.size,
        stock = EXCLUDED.stock;
    `, [productId, base.skuId, color, size, base.quantity || 0, base.price || 0]);
  }
};