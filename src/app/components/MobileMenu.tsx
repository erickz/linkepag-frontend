'use client';

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { AuthNavButton } from "@/components/AuthNavButton";

export function MobileMenu() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo size="sm" showText={true} />
        </Link>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex flex-col items-center justify-center w-10 h-10 gap-1.5 hover:bg-slate-100 rounded-lg transition"
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileMenuOpen}
        >
          <div className={`w-5 h-0.5 bg-slate-900 transition-all ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <div className={`w-5 h-0.5 bg-slate-900 transition-all ${mobileMenuOpen ? 'opacity-0' : ''}`} />
          <div className={`w-5 h-0.5 bg-slate-900 transition-all ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-2">
            <a href="#hero" onClick={handleNavClick} className="py-3 px-4 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition font-medium">
              Início
            </a>
            <a href="#features" onClick={handleNavClick} className="py-3 px-4 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition font-medium">
              Funcionalidades
            </a>
            <a href="#how-it-works" onClick={handleNavClick} className="py-3 px-4 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition font-medium">
              Como funciona
            </a>
            <a href="#pricing" onClick={handleNavClick} className="py-3 px-4 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition font-medium">
              Planos
            </a>
            <Link href="/contato" onClick={handleNavClick} className="py-3 px-4 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition font-medium">
              Contato
            </Link>
            <AuthNavButton onClick={handleNavClick} className="py-3 px-4 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition text-center">
              Começar grátis
            </AuthNavButton>
          </div>
        </div>
      )}
    </nav>
  );
}
