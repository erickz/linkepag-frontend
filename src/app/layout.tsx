import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorSuppressor } from "@/components/ErrorSuppressor";

// MercadoPago SDK V2 - necessário para integração segura e device fingerprinting
const MERCADOPAGO_SDK_URL = "https://sdk.mercadopago.com/js/v2";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Otimização: swap para evitar FOIT
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

// Viewport separado para melhor controle
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10B981" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

// Metadados otimizados
export const metadata: Metadata = {
  title: {
    default: "LinkePag - Monetize sua audiência",
    template: "%s | LinkePag",
  },
  description: "Crie uma página única para seus links e receba pagamentos via PIX. Sua link-in-bio que vende mais.",
  keywords: ["link in bio", "links", "pix", "pagamentos", "criadores", "monetização", "instagram"],
  authors: [{ name: "LinkePag" }],
  creator: "LinkePag",
  publisher: "LinkePag",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "LinkePag",
    title: "LinkePag - Monetize sua audiência",
    description: "Crie uma página única para seus links e receba pagamentos via PIX. Sua link-in-bio que vende mais.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "LinkePag - Monetize sua audiência",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkePag - Monetize sua audiência",
    description: "Crie uma página única para seus links e receba pagamentos via PIX. Sua link-in-bio que vende mais.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Adicionar verificações quando necessário
  },
  
  // Apple Web App
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LinkePag',
  },
  
  // Manifesto
  manifest: '/manifest.json',
};

// Helper para verificar se deve fazer preconnect
function shouldPreconnect(apiUrl: string): boolean {
  // Não fazer preconnect em desenvolvimento (localhost)
  if (apiUrl.includes('localhost')) return false;
  
  // Não fazer preconnect se a URL estiver vazia ou for inválida
  if (!apiUrl || !apiUrl.startsWith('http')) return false;
  
  try {
    // Em produção, verifica se a API é de um domínio diferente
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    if (appUrl) {
      const apiHost = new URL(apiUrl).hostname;
      const appHost = new URL(appUrl).hostname;
      // Se for o mesmo domínio, não precisa de preconnect
      if (apiHost === appHost) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.linkepag.com.br";
  const enablePreconnect = shouldPreconnect(apiUrl);
  
  // Verifica se está em desenvolvimento
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/logo-icon.svg?v=2" />
        <link rel="apple-touch-icon" href="/logo-icon.svg?v=2" />
        
        {/* Preconnect para API backend - apenas em produção e domínio diferente */}
        {enablePreconnect && (
          <>
            <link rel="preconnect" href={apiUrl} />
            <link rel="dns-prefetch" href={apiUrl} />
          </>
        )}
        
        {/* Preconnect para Google Fonts (se usado no futuro) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Script para suprimir warning de WebSocket HMR - APENAS EM DESENVOLVIMENTO */}
        {isDevelopment && <script src="/suppress-ws.js" />}
        
        {/* MercadoPago SDK V2 - obrigatório para integração segura */}
        <Script
          src={MERCADOPAGO_SDK_URL}
          strategy="beforeInteractive"
          id="mercadopago-sdk"
        />
        
        {/* Hotjar Tracking Code */}
        <Script id="hotjar" strategy="afterInteractive">
          {`
            (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:6691457,hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>
        
        {/* Google Analytics - G-F80PQZNQHW */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-F80PQZNQHW"
          strategy="beforeInteractive"
        />
        <Script id="google-analytics-2" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-F80PQZNQHW');
          `}
        </Script>
        
        {/* Desabilitar React DevTools em produção */}
        {!isDevelopment && (
          <script dangerouslySetInnerHTML={{__html: `
            if (typeof window !== 'undefined') {
              // Desabilitar React DevTools
              window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { isDisabled: true };
              // Desabilitar HMR WebSocket
              window.__NEXT_DATA__ = window.__NEXT_DATA__ || {};
              window.__NEXT_DATA__.buildId = '${Date.now()}';
            }
          `}} />
        )}
      </head>
      <body className="antialiased">
        {/* ErrorSuppressor - APENAS EM DESENVOLVIMENTO */}
        {isDevelopment && <ErrorSuppressor />}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
