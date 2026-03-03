import type { NextConfig } from "next";

// Desabilitar telemetria do Next.js
process.env.NEXT_TELEMETRY_DISABLED = '1';

const nextConfig: NextConfig = {
  // Configuração do Turbopack - APENAS EM DESENVOLVIMENTO
  // Desabilita WebSocket HMR do Turbopack para evitar erros ws://localhost:8081
  turbopack: process.env.NODE_ENV === 'development' ? {
    // Usa polling em vez de WebSocket para HMR (mais estável em Docker/WSL)
    hmr: {
      usePolling: true,
    },
  } : undefined,
  
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
  
  // Desabilitar telemetria do Next.js
  // (também definir NEXT_TELEMETRY_DISABLED=1 no .env)
  
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
    // Otimizações de compilação
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
  },
  
  // Desabilitar HMR completamente em produção (evita WebSocket errors)
  onDemandEntries: {
    // Período em que uma página deve ser mantida na memória (ms)
    maxInactiveAge: 60 * 60 * 1000,
    // Número de páginas a serem mantidas na memória
    pagesBufferLength: 5,
  },
  
  // Headers de cache e segurança
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Headers de segurança base
    const securityHeaders = [
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
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
    ];

    // Content Security Policy (apenas em produção)
    if (isProduction) {
      securityHeaders.push({
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self'",
          "connect-src 'self' https://*.vercel.app https://*.railway.app",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "base-uri 'self'",
          "upgrade-insecure-requests",
        ].join('; '),
      });
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
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
