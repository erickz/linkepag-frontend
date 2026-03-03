import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorSuppressor } from "@/components/ErrorSuppressor";

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
  },
  twitter: {
    card: "summary_large_image",
    title: "LinkePag - Monetize sua audiência",
    description: "Crie uma página única para seus links e receba pagamentos via PIX. Sua link-in-bio que vende mais.",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Cache busting */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/logo-icon.svg?v=2" />
        <link rel="apple-touch-icon" href="/logo-icon.svg?v=2" />
        
        {/* Preconnect para API backend - melhora TTFB */}
        <link rel="preconnect" href={apiUrl} />
        <link rel="dns-prefetch" href={apiUrl} />
        
        {/* Preconnect para Google Fonts (se usado no futuro) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Script para suprimir warning de WebSocket HMR antes do React carregar */}
        <script src="/suppress-ws.js" />
      </head>
      <body className="antialiased">
        <ErrorSuppressor />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
