import { Request, Response } from 'express';
import { pool } from '../database.js';

const escapeXml = (unsafe: string) => {
  return (unsafe || '')
    .replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
};

// ⚡ OPTIMIZADO PARA CJ DROPSHIPPING
const normalizeImageUrl = (url: string): string => {
  if (!url) return "";
  let clean = url.trim();
  if (clean.startsWith('//')) return `https:${clean}`;
  // Limpiamos parámetros extraños que a veces traen los CDNs de CJ
  return clean.split('?')[0];
};

export const generateFacebookFeed = async (req: Request, res: Response) => {
  try {
    const country = String(req.query.country || 'CL').toUpperCase();
    const marketFeeds: Record<string, { currency: string; minPrice: number; maxPrice: number; minCpa: number }> = {
      CL: { currency: 'CLP', minPrice: 15000, maxPrice: 90000, minCpa: 4000 },
      MX: { currency: 'MXN', minPrice: 250, maxPrice: 1500, minCpa: 250 }
    };
    const market = marketFeeds[country];
    if (!market) return res.status(400).send('País no soportado para el catálogo.');

    const rawFrontendUrl = process.env.FRONTEND_URL || "";
    const SITE_URL = rawFrontendUrl.replace(/\/$/, "") ||
      (process.env.NODE_ENV === 'production' ? 'https://ravsstore.com' : 'http://localhost:3000');

    const isProd = SITE_URL.includes('ravsstore.com');
    console.log(`📦 Generando Feed | ENV: ${isProd ? 'PRODUCCIÓN' : 'LOCAL'} | SITE_URL: ${SITE_URL}`);

    // Nota: p.aliexpress_id ahora contiene el PID de CJ Dropshipping
    const query = `
      SELECT
        p.id, p.aliexpress_id, p.title_original, p.image_url, p.local_images,
        p.suggested_price_local, p.suggested_price, p.base_cost_usd,
        p.shipping_cost_usd, p.roi_percent, p.net_margin_usd,
        p.total_stock, p.target_country, p.status, p.marketing_copy,
        c.name as category_name, c.slug as category_slug,
        COALESCE((
          SELECT json_agg(json_build_object('image_url', pv.image_url, 'stock', pv.stock))
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_active = true AND pv.stock > 0
        ), '[]'::json) as active_variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.target_country = $1
        AND p.status IN ('ACTIVE','ELITE','APPROVED','PUBLISHED','WINNER')
        AND p.suggested_price_local IS NOT NULL
        AND p.suggested_price_local >= $2
        AND p.suggested_price_local <= $3
        AND p.net_margin_usd >= 5
        AND COALESCE((p.marketing_copy->'analysis'->>'isViableForAds')::boolean, true) = true
        AND COALESCE((p.marketing_copy->'analysis'->>'cpaMaxLocal')::numeric, 0) >= $4
        AND (
          p.total_stock > 0
          OR EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.stock > 0)
        )
      ORDER BY p.roi_percent DESC NULLS LAST
      LIMIT 5000;
    `;

    const { rows } = await pool.query(query, [country, market.minPrice, market.maxPrice, market.minCpa]);

    let xml = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Catálogo Aether Trade - RAVS</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>Catálogo dinámico de productos ganadores para Meta Ads</description>
`;

    for (const p of rows) {
      // 1. Títulos y Descripciones (Priorizamos los textos de la IA, no el HTML crudo)
      const marketingTitle = p.marketing_copy?.title_localized || p.marketing_copy?.copywriting?.title_localized;
      const finalTitle = escapeXml((marketingTitle || p.title_original).substring(0, 150));

      const marketingDesc = p.marketing_copy?.description_localized || p.marketing_copy?.copywriting?.description_localized || p.marketing_copy?.hook || p.title_original;
      const finalDesc = escapeXml(marketingDesc.substring(0, 5000));

      // 2. Procesamiento de Imágenes
      const rawLocalImages = Array.isArray(p.local_images)
        ? p.local_images.filter((u: string) => u && u.trim() !== "")
        : [];

      const variantImages = Array.isArray(p.active_variants)
        ? p.active_variants.map((v: any) => v.image_url).filter((u: string) => u && u.trim() !== "")
        : [];

      let allImages: string[] = [];
      if (rawLocalImages.length > 0) {
        allImages = rawLocalImages;
      } else if (variantImages.length > 0) {
        allImages = variantImages;
      } else if (p.image_url) {
        allImages = [p.image_url];
      }

      allImages = allImages.map(normalizeImageUrl).filter(Boolean);
      const mainImage = escapeXml(allImages[0] || "");
      
      let additionalImages = '';
      allImages.slice(1, 5).forEach((img: string) => {
        additionalImages += `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>\n`;
      });

      // 3. Etiquetas Personalizadas
      const cpaMaxLocal = p.marketing_copy?.analysis?.cpaMaxLocal || '';
      const marketingAngle = p.marketing_copy?.meta_targeting?.marketing_angle || '';
      const interest = p.marketing_copy?.meta_targeting?.interests?.[0] || p.marketing_copy?.meta_targeting?.buyer_persona || '';

      // 4. URL del Producto (Mapeado correctamente al PID de CJ)
      const productUrl = `${SITE_URL}/products/${p.aliexpress_id || p.id}`;
      
      xml += `    <item>
      <g:id>${escapeXml(String(p.aliexpress_id || p.id))}</g:id>
      <g:item_group_id>${escapeXml(String(p.aliexpress_id || p.id))}</g:item_group_id>
      <g:title>${finalTitle}</g:title>
      <g:description>${finalDesc}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${mainImage}</g:image_link>
${additionalImages}      <g:availability>${p.total_stock > 0 || variantImages.length > 0 ? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${Number(p.suggested_price_local).toFixed(2)} ${market.currency}</g:price>
      <g:brand>RAVSSTORE</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>${escapeXml(p.category_name || p.category_slug || 'General')}</g:google_product_category>
      <g:custom_label_0>${escapeXml(String(p.roi_percent))}</g:custom_label_0>
      <g:custom_label_1>${escapeXml(p.category_slug || '')}</g:custom_label_1>
      <g:custom_label_2>${escapeXml(marketingAngle)}</g:custom_label_2>
      <g:custom_label_3>${escapeXml(String(cpaMaxLocal))}</g:custom_label_3>
      <g:custom_label_4>${escapeXml(interest)}</g:custom_label_4>
    </item>\n`;
    }

    xml += `  </channel>\n</rss>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send(xml);

  } catch (error) {
    console.error('❌ Error generando Feed de Facebook:', error);
    return res.status(500).send('Error interno generando el catálogo.');
  }
};