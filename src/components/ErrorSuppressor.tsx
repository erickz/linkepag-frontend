'use client';

import { useEffect, useLayoutEffect } from 'react';

/**
 * Componente que suprime erros e warnings específicos no console
 * Esses erros ocorrem durante HMR e navegação, mas não afetam a funcionalidade
 */
export function ErrorSuppressor() {
  // useLayoutEffect executa antes da pintura, capturando erros mais cedo
  useLayoutEffect(() => {
    // Suprime erros de AbortController e WebSocket HMR no console
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const errorMessage = args[0]?.toString() || '';
      
      // Verifica se é um erro de AbortController
      if (
        errorMessage.includes('AbortError') ||
        errorMessage.includes('signal is aborted') ||
        (args[0] instanceof Error && args[0].name === 'AbortError')
      ) {
        return;
      }
      
      // Suprime warning de WebSocket HMR do Turbopack (ws://localhost:8081)
      if (
        errorMessage.includes('WebSocket connection') &&
        errorMessage.includes('ws://localhost:8081')
      ) {
        return;
      }
      
      // Passa outros erros para o console original
      originalConsoleError.apply(console, args);
    };
    
    // Também suprime warnings do console.warn relacionados ao WebSocket HMR
    const originalConsoleWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const warnMessage = args[0]?.toString() || '';
      
      // Suprime warnings de WebSocket HMR
      if (
        warnMessage.includes('WebSocket') &&
        warnMessage.includes('8081')
      ) {
        return;
      }
      
      originalConsoleWarn.apply(console, args);
    };

    // Também suprime erros não tratados de AbortController
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.name === 'AbortError' ||
        event.reason?.message?.includes('signal is aborted')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
