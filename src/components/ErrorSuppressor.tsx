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
      if (args.length === 0) {
        originalConsoleError.apply(console, args);
        return;
      }
      
      const firstArg = args[0];
      const errorMessage = typeof firstArg === 'string' ? firstArg : 
                           firstArg instanceof Error ? firstArg.message : 
                           String(firstArg);
      
      // Verifica se é um erro de AbortController
      if (
        errorMessage.includes('AbortError') ||
        errorMessage.includes('signal is aborted') ||
        (firstArg instanceof Error && firstArg.name === 'AbortError')
      ) {
        return;
      }
      
      // Suprime warning de WebSocket HMR do Turbopack (ws://localhost:8081)
      // Verifica várias formas que o erro pode aparecer
      if (
        errorMessage.includes('WebSocket') && 
        (errorMessage.includes('8081') || errorMessage.includes('localhost'))
      ) {
        return;
      }
      
      // Suprime erros de conexão WebSocket genéricos
      if (
        errorMessage.includes('WebSocket connection') &&
        (errorMessage.includes('failed') || errorMessage.includes('error'))
      ) {
        return;
      }
      
      // Passa outros erros para o console original
      originalConsoleError.apply(console, args);
    };
    
    // Também suprime warnings do console.warn relacionados ao WebSocket HMR
    const originalConsoleWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      if (args.length === 0) {
        originalConsoleWarn.apply(console, args);
        return;
      }
      
      const firstArg = args[0];
      const warnMessage = typeof firstArg === 'string' ? firstArg : 
                          firstArg instanceof Error ? firstArg.message : 
                          String(firstArg);
      
      // Suprime warnings de WebSocket HMR
      if (
        warnMessage.includes('WebSocket') &&
        (warnMessage.includes('8081') || warnMessage.includes('localhost'))
      ) {
        return;
      }
      
      // Suprime warnings de preconnect não utilizado
      if (
        warnMessage.includes('preloaded') ||
        warnMessage.includes('preconnect') ||
        warnMessage.includes('dns-prefetch')
      ) {
        return;
      }
      
      originalConsoleWarn.apply(console, args);
    };

    // Também suprime erros não tratados de AbortController e WebSocket
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || reason?.toString() || '';
      
      // AbortController
      if (
        reason?.name === 'AbortError' ||
        message.includes('signal is aborted') ||
        message.includes('AbortError')
      ) {
        event.preventDefault();
        return;
      }
      
      // WebSocket
      if (
        message.includes('WebSocket') &&
        (message.includes('8081') || message.includes('localhost'))
      ) {
        event.preventDefault();
        return;
      }
    };

    // Intercepta erros de erro global
    const handleError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || '';
      
      // Suprime erros de WebSocket
      if (
        message.includes('WebSocket') &&
        (message.includes('8081') || message.includes('localhost'))
      ) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return null;
}
