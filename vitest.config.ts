/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global setup
    globals: true,
    
    // Setup files
    setupFiles: ['./src/test/setup.ts'],
    
    // Include patterns
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.next',
      'cypress'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/dist/**',
        '**/.next/**'
      ]
    },
    
    // Timeout settings
    testTimeout: 10000,
    hookTimeout: 10000,
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    
    // Watch mode settings
    watch: false,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@automarket/core': path.resolve(__dirname, './packages/core/src'),
      '@automarket/providers': path.resolve(__dirname, './packages/providers/src'),
      '@automarket/workflows': path.resolve(__dirname, './packages/workflows/src'),
      '@automarket/assets': path.resolve(__dirname, './packages/assets/src')
    }
  },
  
  // Define configuration for better TypeScript support
  define: {
    'process.env.NODE_ENV': '"test"'
  },

  // Optimize dependencies for better compatibility
  optimizeDeps: {
    include: ['form-data', 'node-fetch']
  },

  // Handle ES modules properly
  ssr: {
    noExternal: ['form-data']
  }
})
