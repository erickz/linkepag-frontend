'use client';

import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { AuthNavButton } from '@/components/AuthNavButton';
import { MobileMenu } from '../components/MobileMenu';
import { IconMail, IconMessageSquare } from '@/components/icons';

// Ícones de redes sociais
function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
    </svg>
  );
}

export default function ContatoPage() {
  const socialLinks = [
    {
      name: 'Instagram',
      handle: '@linkepag',
      url: 'https://instagram.com/linkepag',
      icon: IconInstagram,
      color: 'from-purple-500 via-pink-500 to-orange-400',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
      borderColor: 'border-purple-100',
      iconBg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
      description: 'Siga-nos para novidades e dicas'
    },
    {
      name: 'TikTok',
      handle: '@linkepag',
      url: 'https://tiktok.com/@linkepag',
      icon: IconTikTok,
      color: 'from-black to-gray-800',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      iconBg: 'bg-black',
      description: 'Conteúdo exclusivo e tutoriais'
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar Fixa e Centralizada - Desktop */}
      <nav className="hidden lg:block fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-6 py-2 border border-slate-200">
        <div className="flex items-center gap-6">
          <Link href="/" className="mr-2 hover:opacity-90 transition-opacity">
            <Logo size="sm" showText={true} />
          </Link>
          <div className="w-px h-6 bg-slate-200" />
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
            Início
          </Link>
          <Link href="/#how-it-works" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
            Como funciona
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition">
            Planos
          </Link>
          <Link href="/faq" className="text-sm font-medium text-slate-600">
            FAQ
          </Link>
          <Link
              href="/login" className="inline-flex items-center justify-center h-9 px-5 rounded-full bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition shadow-md shadow-emerald-200">
            Login
          </Link>
        </div>
      </nav>

      {/* Navbar Mobile */}
      <MobileMenu />

      <div className="lg:hidden h-16" />

      {/* Conteúdo Principal */}
      <section className="flex-1 flex items-center justify-center pt-24 pb-12 lg:pt-32 lg:pb-16 px-6">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              <IconMessageSquare className="w-4 h-4" />
              Fale conosco
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Entre em <span className="text-indigo-600">contato</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-lg mx-auto">
              Tem dúvidas ou precisa de ajuda? Nossa equipe está pronta para atender você pelas nossas redes sociais.
            </p>
          </div>

          {/* Cards de Redes Sociais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative ${social.bgColor} ${social.borderColor} border rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${social.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                    <social.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 mb-0.5">
                      {social.name}
                    </h3>
                    <p className="text-sm font-medium text-slate-500 mb-1.5">
                      {social.handle}
                    </p>
                    <p className="text-xs text-slate-400">
                      {social.description}
                    </p>
                  </div>
                  <svg 
                    className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors flex-shrink-0" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <p className="text-slate-500 text-sm mb-4">Ainda não tem uma conta?</p>
            <AuthNavButton className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition shadow-lg shadow-emerald-200">
              Criar conta grátis
            </AuthNavButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Logo size="sm" showText={false} />
              <span className="text-white font-bold">LinkePag</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2026 LinkePag - Monetize sua audiência.
            </p>
            <Link href="/termos" className="text-slate-500 hover:text-slate-300 transition text-sm">
              Termos de uso
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
