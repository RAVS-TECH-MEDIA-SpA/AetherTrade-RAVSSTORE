import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api', '/checkout'], // Evitamos que indexe el panel o la API
    },
    sitemap: 'https://ravsstore.com/sitemap.xml',
  };
}