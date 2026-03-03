import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuração do Turbopack - vazia pois usamos configuração webpack para HMR com polling
  turbopack: {},
  
  // Otimização de imagens
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // Compressão gzip/brotli
  compress: true,
  
  // Otimizações de produção
  poweredByHeader: false,
  generateEtags: true,
  
  // Configuração do webpack mantida para compatibilidade
  // Nota: Com Turbopack, algumas configurações webpack podem não ser aplicadas
  webpack: (config, { isServer, dev }) => {
    // Configurações de desenvolvimento
    if (dev && !isServer) {
      // Configuração para HMR funcionar corretamente
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000, // Polling para ambientes Docker
        aggregateTimeout: 300,
      };
      // Desabilita WebSocket para evitar warning - usa apenas polling
      config.infrastructureLogging = {
        ...config.infrastructureLogging,
        level: 'error',
      };
    }
    return config;
  },
  
  // Desabilita WebSocket do Turbopack (evita warning ws://localhost:8081)
  devIndicators: {
    position: 'bottom-right',
  },
  
  // Configurações experimentais
  experimental: {
    // Server Components HMR Cache - melhora performance em desenvolvimento
    serverComponentsHmrCache: true,
  },
  
  // Headers de cache e segurança
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // Cache para assets estáticos
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache para fontes
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
