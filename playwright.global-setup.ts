import { server } from './src/mocks/setup';

export default async () => {
  // Start the MSW server before all tests
  server.listen();
  console.log('MSW server started');
};

// Global teardown to close MSW server
export const globalTeardown = async () => {
  server.close();
  console.log('MSW server closed');
};
