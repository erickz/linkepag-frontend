// Re-export handlers for easy importing in tests
export { handlers } from './handlers';
export { server } from './setup';

// Utility to reset MSW handlers between tests
export function resetMocks() {
  // Handlers can be reset by calling server.resetHandlers()
  // This is useful when you want to change mock behavior per test
}
