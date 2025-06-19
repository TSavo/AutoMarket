/**
 * Vitest Test Setup
 * 
 * Global test configuration and mocks for Vitest
 */

import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Global mocks
beforeAll(() => {
  // Mock fetch globally
  global.fetch = vi.fn()
  
  // Mock console methods to reduce noise in tests
  const originalConsole = global.console;
  global.console = {
    ...originalConsole,
    // Uncomment to suppress console.log in tests
    // log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as Console;
  
  // Mock environment variables
  (process.env as any).NODE_ENV = 'test'
  process.env.OLLAMA_URL = 'http://localhost:11434'
  
  // Mock node-fetch for Node.js compatibility
  vi.mock('node-fetch', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
      ...actual,
      default: vi.fn(),
      __esModule: true,
    }
  })
  
  // Mock fs operations
  vi.mock('fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    statSync: vi.fn(),
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      stat: vi.fn(),
    }
  }))
  
  // Mock child_process
  vi.mock('child_process', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
      ...actual,
      exec: vi.fn(),
      spawn: vi.fn(),
    }
  })
  
  // Mock form-data
  vi.mock('form-data', () => {
    return {
      default: vi.fn().mockImplementation(() => ({
        append: vi.fn(),
        getHeaders: vi.fn().mockReturnValue({}),
      }))
    }
  })
})

// Custom matchers (if needed)
expect.extend({
  toBeValidMediaInput(received) {
    const isValid = received && 
      typeof received === 'object' &&
      'type' in received &&
      'data' in received &&
      ['text', 'audio', 'image', 'video'].includes(received.type)
    
    return {
      message: () => `expected ${received} to be a valid MediaInput`,
      pass: isValid,
    }
  },
  
  toBeValidMediaOutput(received) {
    const isValid = received && 
      typeof received === 'object' &&
      'type' in received &&
      'data' in received &&
      ['text', 'audio', 'image', 'video'].includes(received.type)
    
    return {
      message: () => `expected ${received} to be a valid MediaOutput`,
      pass: isValid,
    }
  }
})

// Type declarations for custom matchers
declare module 'vitest' {
  interface Assertion<T = any> {
    toBeValidMediaInput(): T
    toBeValidMediaOutput(): T
  }
  interface AsymmetricMatchersContaining {
    toBeValidMediaInput(): any
    toBeValidMediaOutput(): any
  }
}
