/**
 * Suprime erros de WebSocket HMR do Turbopack
 * Este script é carregado antes do React para suprimir erros de WebSocket
 * que ocorrem em desenvolvimento mas não afetam a funcionalidade
 */
(function() {
  'use strict';
  
  // Guarda referências originais
  const originalError = console.error;
  const originalWarn = console.warn;
  
  /**
   * Verifica se a mensagem é relacionada a WebSocket HMR
   */
  function isWebSocketHMRMessage(msg) {
    if (!msg || typeof msg !== 'string') return false;
    return msg.includes('WebSocket') && (msg.includes('8081') || msg.includes('localhost'));
  }
  
  /**
   * Verifica se é um erro de preconnect não utilizado
   */
  function isPreconnectWarning(msg) {
    if (!msg || typeof msg !== 'string') return false;
    return msg.includes('preloaded') || msg.includes('preconnect') || msg.includes('dns-prefetch');
  }
  
  // Sobrescreve console.error
  console.error = function() {
    const msg = arguments[0];
    const msgStr = msg && typeof msg.toString === 'function' ? msg.toString() : String(msg);
    
    if (isWebSocketHMRMessage(msgStr)) {
      return; // Silencia erros de WebSocket HMR
    }
    
    return originalError.apply(console, arguments);
  };
  
  // Sobrescreve console.warn
  console.warn = function() {
    const msg = arguments[0];
    const msgStr = msg && typeof msg.toString === 'function' ? msg.toString() : String(msg);
    
    if (isWebSocketHMRMessage(msgStr) || isPreconnectWarning(msgStr)) {
      return; // Silencia warnings de WebSocket e preconnect
    }
    
    return originalWarn.apply(console, arguments);
  };
  
  // Também intercepta erros de erro global
  window.addEventListener('error', function(event) {
    const msg = event.message || '';
    if (isWebSocketHMRMessage(msg)) {
      event.preventDefault();
      return false;
    }
  });
  
  // Intercepta rejeições de promises não tratadas
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    const msg = reason && typeof reason.toString === 'function' ? reason.toString() : String(reason);
    
    if (isWebSocketHMRMessage(msg)) {
      event.preventDefault();
    }
  });
})();
