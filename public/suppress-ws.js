// Suprime erros de WebSocket HMR do Turbopack
(function() {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function() {
    const msg = arguments[0] && arguments[0].toString ? arguments[0].toString() : '';
    if (msg.includes('WebSocket') && msg.includes('8081')) {
      return;
    }
    return originalError.apply(console, arguments);
  };
  
  console.warn = function() {
    const msg = arguments[0] && arguments[0].toString ? arguments[0].toString() : '';
    if (msg.includes('WebSocket') && msg.includes('8081')) {
      return;
    }
    return originalWarn.apply(console, arguments);
  };
})();
