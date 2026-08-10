/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.alicdn.com' },      // Cubre ae01, ae02, ae03, etc.
      { protocol: 'https', hostname: '**.ytimg.com' },      // Para thumbnails de videos de YouTube
      { protocol: 'https', hostname: '**.serper.dev' },
      // Opcional: Si usas Serper, las imágenes pueden venir de cualquier sitio. 
      // Si ves errores de host específico, agrégalos aquí.
    ],
  },
};

export default nextConfig;