'use client';

import { useEffect } from 'react';
import { flushPixelQueue } from '@/lib/pixel-queue';

/**
 * Componente invisível que faz flush da fila de pixels pendentes.
 * Deve ser montado em todas as páginas (dentro do Providers).
 *
 * Por que não usar script inline no <head>?
 * - O script inline roda antes dos pixels carregarem
 * - Aqui usamos useEffect, que roda APÓS a hidratação React
 * - Dá tempo dos scripts de pixel (TikTok/Meta) carregarem e inicializarem
 */
export function PixelFlush() {
  useEffect(() => {
    // Primeira tentativa: após hidratação inicial
    const timer1 = setTimeout(() => {
      flushPixelQueue();
    }, 500);

    // Segunda tentativa: após 2s (caso pixel ainda não tenha carregado)
    const timer2 = setTimeout(() => {
      flushPixelQueue();
    }, 2000);

    // Terceira tentativa: após 5s (última chance)
    const timer3 = setTimeout(() => {
      flushPixelQueue();
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return null;
}
