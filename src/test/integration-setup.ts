// Vitest integration test setup file
// This setup provides real fetch functionality for integration tests
import { beforeAll, vi } from 'vitest';

// Polyfill fetch for Node.js environment using undici
beforeAll(async () => {
  try {
    const { fetch, Headers, Request, Response, FormData } = await import('undici');
    
    // Set global fetch and related APIs
    global.fetch = fetch as any;
    global.Headers = Headers as any;
    global.Request = Request as any;
    global.Response = Response as any;
    global.FormData = FormData as any;
    
    console.log('✅ Fetch polyfill loaded using undici for integration tests');
  } catch (error) {
    console.warn('⚠️ Failed to load undici polyfill:', error);
    // Fallback to node-fetch if undici fails
    try {
      const fetch = await import('node-fetch');
      global.fetch = fetch.default as any;
      console.log('✅ Fallback to node-fetch for integration tests');
    } catch (fallbackError) {
      console.error('❌ Failed to load any fetch polyfill:', fallbackError);
    }
  }
});

// Unmock modules that integration tests need to work with real implementations
vi.unmock('fs');
vi.unmock('path');
vi.unmock('child_process');
vi.unmock('node-fetch');
vi.unmock('form-data');

// Set environment for integration tests
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  console.log('🧪 Integration test setup complete - real implementations enabled');
});
