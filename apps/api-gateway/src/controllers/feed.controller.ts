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

const normalizeImageUrl = (url: string): string => {
  if (!url) return "";
  let clean = url.trim();
  if (!clean) return "";
  if (clean.startsWith('//')) return `https:${clean}`;
  return clean;
};

export const generateFacebookFeed = async (req: Request, res: Response) => {
  try {
    // --- DETECCIÓN DE ENTORNO ---
    // En docker-compose tienes FRONTEND_URL=http://localhost:3000 en local
    // y en producción es https://ravsstore.com
    const rawFrontendUrl = process.env.FRONTEND_URL || "";
    const SITE_URL = rawFrontendUrl.replace(/\/$/, "") ||
      (process.env.NODE_ENV === 'production'? 'https://ravsstore.com' : 'http://localhost:3000');

    const isProd = SITE_URL.includes('ravsstore.com');
    console.log(`📦 Generando Feed | ENV: ${isProd? 'PRODUCCIÓN' : 'LOCAL'} | SITE_URL: ${SITE_URL}`);

    const query = `
      SELECT
        p.id, p.aliexpress_id, p.title_original, p.image_url, p.local_images,
        p.suggested_price_local, p.suggested_price, p.base_cost_usd,
        p.shipping_cost_usd, p.roi_percent, p.net_margin_usd,
        p.total_stock, p.target_country, p.status, p.marketing_copy,
        c.name as category_name, c.slug as category_slug,
        s.store_name as brand_name,
        COALESCE((
          SELECT json_agg(json_build_object('image_url', pv.image_url, 'stock', pv.stock))
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_active = true AND pv.stock > 0
        ), '[]'::json) as active_variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.target_country = 'CL'
        AND p.status IN ('ACTIVE','ELITE','APPROVED','PUBLISHED','WINNER')
        AND p.suggested_price_local IS NOT NULL
        AND p.suggested_price_local >= 15000
        AND p.suggested_price_local <= 90000
        AND p.net_margin_usd >= 5
        AND COALESCE((p.marketing_copy->'analysis'->>'isViableForAds')::boolean, true) = true
        AND COALESCE((p.marketing_copy->'analysis'->>'cpaMaxLocal')::numeric, 999999) >= 4000
        AND (
          p.total_stock > 0
          OR EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.stock > 0)
        )
      ORDER BY p.roi_percent DESC NULLS LAST
      LIMIT 5000;
    `;

    const { rows } = await pool.query(query);

    let xml = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Catálogo Aether Trade - RAVS</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>Catálogo dinámico de productos ganadores para Meta Ads</description>
`;

    for (const p of rows) {
      const marketingTitle = p.marketing_copy?.title_localized || p.marketing_copy?.copywriting?.title_localized;
      const finalTitle = escapeXml((marketingTitle || p.title_original).substring(0, 150));

      const marketingDesc = p.marketing_copy?.description_localized || p.marketing_copy?.copywriting?.description_localized || p.marketing_copy?.hook || p.title_original;
      const finalDesc = escapeXml(marketingDesc.substring(0, 5000));

      // --- FIX DEFINITIVO DE IMÁGENES ---
      const rawLocalImages = Array.isArray(p.local_images)
       ? p.local_images.filter((u: string) => u && u.trim()!== "")
        : [];

      const variantImages = Array.isArray(p.active_variants)
       ? p.active_variants.map((v: any) => v.image_url).filter((u: string) => u && u.trim()!== "")
        : [];

      let allImages: string[] = [];
      if (rawLocalImages.length > 0) {
        allImages = rawLocalImages;
      } else if (variantImages.length > 0) {
        allImages = variantImages;
      } else if (p.image_url) {
        allImages = [p.image_url];
      }

      // Normaliza //ae01... -> https://ae01...
      allImages = allImages.map(normalizeImageUrl).filter(Boolean);

      const mainImage = escapeXml(allImages[0] || "");
      let additionalImages = '';
      allImages.slice(1, 5).forEach((img: string) => {
        additionalImages += ` <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>\n`;
      });

      const cpaMaxLocal = p.marketing_copy?.analysis?.cpaMaxLocal || '';
      const marketingAngle = p.marketing_copy?.meta_targeting?.marketing_angle || '';
      const interest = p.marketing_copy?.meta_targeting?.interests?.[0] || p.marketing_copy?.meta_targeting?.buyer_persona || '';

      // --- FIX RUTA: /products/ en vez de /p/ ---
      const productUrl = `${SITE_URL}/products/${p.aliexpress_id || p.id}`;
      xml += ` <item>
      <g:id>${escapeXml(String(p.aliexpress_id || p.id))}</g:id>
      <g:item_group_id>${escapeXml(String(p.aliexpress_id || p.id))}</g:item_group_id>
      <g:title>${finalTitle}</g:title>
      <g:description>${finalDesc}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${mainImage}</g:image_link>
${additionalImages} <g:availability>${p.total_stock > 0 || variantImages.length > 0? 'in stock' : 'out of stock'}</g:availability>
      <g:price>${Number(p.suggested_price_local).toFixed(2)} CLP</g:price>
      <g:brand>${escapeXml(p.brand_name || 'RAVSSTORE')}</g:brand>
      <g:condition>new</g:condition>
      <g:google_product_category>${escapeXml(p.category_name || p.category_slug || 'General')}</g:google_product_category>
      <g:custom_label_0>${escapeXml(String(p.roi_percent))}</g:custom_label_0>
      <g:custom_label_1>${escapeXml(p.category_slug || '')}</g:custom_label_1>
      <g:custom_label_2>${escapeXml(marketingAngle)}</g:custom_label_2>
      <g:custom_label_3>${escapeXml(String(cpaMaxLocal))}</g:custom_label_3>
      <g:custom_label_4>${escapeXml(interest)}</g:custom_label_4>
    </item>
`;
    }

    xml += ` </channel>\n</rss>`;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    return res.status(200).send(xml);

  } catch (error) {
    console.error('❌ Error generando Feed de Facebook:', error);
    return res.status(500).send('Error interno generando el catálogo.');
  }
};