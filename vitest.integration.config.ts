import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Use Node environment for integration tests
    environment: 'node',
    
    // Setup file specifically for integration tests (no global mocks)
    setupFiles: ['./src/test/integration-setup.ts'],
    
    // Include only integration test files
    include: ['**/*.integration.test.{js,ts}'],
    
    // Longer timeout for integration tests
    testTimeout: 120000,
    
    // Allow real network requests
    globals: false,
    
    // Don't mock anything by default for integration tests
    clearMocks: false,
    restoreMocks: false,
    
    // Reporters
    reporters: ['verbose', 'json'],
    
    // Coverage (optional)
    coverage: {
      enabled: false, // Disable for integration tests
    },
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
