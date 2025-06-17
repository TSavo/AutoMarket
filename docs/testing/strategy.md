# Testing Strategy

## 🎯 Overview

The AutoMarket Media Transformation System employs a comprehensive testing strategy that ensures reliability, performance, and maintainability across all components. Our testing approach combines unit tests, integration tests, and real-world validation.

## 🏗️ Testing Architecture

### Testing Pyramid

```
                    🔺
                   /   \
                  /  E2E \
                 /       \
                /---------\
               /Integration\
              /             \
             /---------------\
            /   Unit Tests    \
           /___________________\
```

**Distribution**:
- **70% Unit Tests**: Fast, isolated, comprehensive coverage
- **25% Integration Tests**: Real service validation
- **5% End-to-End Tests**: Full workflow validation

## 🧪 Test Types

### 1. Unit Tests

**Purpose**: Test individual components in isolation with mocked dependencies.

**Characteristics**:
- ⚡ Fast execution (< 100ms per test)
- 🔒 Isolated from external dependencies
- 🎯 High code coverage (>90%)
- 🔄 Run on every code change

**Example**:
```typescript
describe('ChatterboxTTSDockerService Unit Tests', () => {
  test('should validate input types', async () => {
    const service = new ChatterboxTTSDockerService();
    const invalidInput = { type: 'image' as const, data: 'test' };
    
    await expect(service.transform(invalidInput, 'audio'))
      .rejects.toThrow('ChatterboxTTSDockerService only supports text input');
  });
});
```

### 2. Integration Tests

**Purpose**: Test services with real Docker containers and actual transformations.

**Characteristics**:
- 🐳 Real Docker services
- 🎵 Actual audio/text processing
- ⏱️ Longer execution (30s - 2min per test)
- 🔍 End-to-end functionality validation

**Example**:
```typescript
describe('ChatterboxTTSDockerService Integration Tests', () => {
  test('should generate real TTS audio', async () => {
    const service = new ChatterboxTTSDockerService();
    
    const result = await service.generateTTS(
      'Integration test audio',
      './temp/test.mp3'
    );
    
    expect(result.success).toBe(true);
    expect(fs.existsSync(result.audioPath!)).toBe(true);
    expect(result.duration).toBeGreaterThan(0);
  });
});
```

### 3. Self-Management Tests

**Purpose**: Validate Docker container lifecycle management.

**Characteristics**:
- 🐳 Docker container operations
- 🔄 Service lifecycle validation
- 📊 Health monitoring verification
- 🛡️ Error recovery testing

**Example**:
```typescript
describe('Docker Self-Management', () => {
  test('should handle complete lifecycle', async () => {
    const service = new ChatterboxTTSDockerService();
    
    // Start service
    const started = await service.startService();
    expect(started).toBe(true);
    
    // Verify running
    const status = await service.getServiceStatus();
    expect(status).toBe('running');
    
    // Stop service
    const stopped = await service.stopService();
    expect(stopped).toBe(true);
  });
});
```

## 🔧 Test Configuration

### Vitest Configuration

#### Unit Tests (vitest.config.ts)
```typescript
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{js,ts}'],
    exclude: ['**/*.integration.test.{js,ts}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
});
```

#### Integration Tests (vitest.integration.config.ts)
```typescript
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/integration-setup.ts'],
    include: ['**/*.integration.test.{js,ts}'],
    testTimeout: 120000, // 2 minutes for Docker operations
    globals: false,
    clearMocks: false,
    restoreMocks: false
  }
});
```

### Test Setup Files

#### Unit Test Setup (src/test/setup.ts)
```typescript
import { vi } from 'vitest';

beforeAll(() => {
  // Mock external dependencies
  global.fetch = vi.fn();
  
  // Mock Docker operations
  vi.mock('child_process', () => ({
    exec: vi.fn(),
    spawn: vi.fn()
  }));
  
  // Mock file system
  vi.mock('fs', () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn()
  }));
});
```

#### Integration Test Setup (src/test/integration-setup.ts)
```typescript
import { beforeAll } from 'vitest';

beforeAll(async () => {
  // Polyfill fetch for Node.js environment
  const { fetch, Headers, Request, Response, FormData } = await import('undici');
  
  global.fetch = fetch as any;
  global.Headers = Headers as any;
  global.Request = Request as any;
  global.Response = Response as any;
  global.FormData = FormData as any;
  
  console.log('✅ Fetch polyfill loaded using undici for integration tests');
});
```

## 🎯 Test Patterns

### 1. Service Testing Pattern

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  
  beforeEach(() => {
    service = new ServiceName();
  });
  
  describe('Service Information', () => {
    test('should provide correct service info', () => {
      const info = service.getInfo();
      expect(info.id).toBe('expected-id');
      expect(info.transforms).toHaveLength(1);
    });
  });
  
  describe('Input Validation', () => {
    test('should validate input types', async () => {
      // Test invalid input
    });
    
    test('should validate output types', async () => {
      // Test invalid output
    });
  });
  
  describe('Core Functionality', () => {
    test('should perform transformation', async () => {
      // Test main functionality
    });
  });
});
```

### 2. Docker Management Testing Pattern

```typescript
describe('Docker Self-Management', () => {
  describe('Service Lifecycle', () => {
    test('should start service', async () => {
      // Test service startup
    });
    
    test('should stop service', async () => {
      // Test service shutdown
    });
    
    test('should restart service', async () => {
      // Test service restart
    });
  });
  
  describe('Health Monitoring', () => {
    test('should check service status', async () => {
      // Test status checking
    });
    
    test('should detect healthy service', async () => {
      // Test health detection
    });
  });
  
  describe('Error Handling', () => {
    test('should handle startup failures', async () => {
      // Test error scenarios
    });
  });
});
```

### 3. Integration Testing Pattern

```typescript
describe('Service Integration Tests', () => {
  let service: ServiceType;
  
  beforeAll(async () => {
    service = new ServiceType();
    // Start service for all tests
    await service.startService();
  });
  
  afterAll(async () => {
    // Clean up after all tests
    await service.stopService();
  });
  
  test('should perform real transformation', async () => {
    // Test with real service
  });
});
```

## 📊 Test Metrics & Coverage

### Coverage Requirements

| Component Type | Line Coverage | Branch Coverage | Function Coverage |
|----------------|---------------|-----------------|-------------------|
| Core Logic     | 95%           | 90%             | 100%              |
| Service Classes| 90%           | 85%             | 95%               |
| Utilities      | 85%           | 80%             | 90%               |
| Integration    | 70%           | 65%             | 80%               |

### Performance Benchmarks

| Test Type | Target Duration | Max Duration |
|-----------|----------------|--------------|
| Unit Test | < 100ms        | 500ms        |
| Integration Test | < 30s    | 120s         |
| Full Suite | < 5min         | 10min        |

## 🚀 Running Tests

### Command Reference

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- ChatterboxTTSDockerService.test.ts

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- ChatterboxTTSDockerService.integration.test.ts

# Watch mode for development
npm run test -- --watch

# Debug mode
npm run test -- --inspect-brk
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:dind
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
```

## 🛡️ Test Quality Assurance

### Code Quality Checks

```typescript
// Test naming convention
describe('ComponentName', () => {
  test('should [expected behavior] when [condition]', () => {
    // Arrange
    const input = createTestInput();
    
    // Act
    const result = performAction(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
});
```

### Test Data Management

```typescript
// Test fixtures
const TEST_FIXTURES = {
  validTextInput: {
    type: 'text' as const,
    data: 'Test text for TTS generation'
  },
  
  validAudioPath: path.join(__dirname, 'fixtures/test-audio.wav'),
  
  mockTTSResponse: {
    success: true,
    audioPath: '/tmp/test.mp3',
    duration: 2.5,
    processingTime: 1500
  }
};
```

### Assertion Patterns

```typescript
// Comprehensive assertions
expect(result).toEqual(
  expect.objectContaining({
    success: true,
    audioPath: expect.stringMatching(/\.mp3$/),
    duration: expect.any(Number),
    processingTime: expect.any(Number)
  })
);

// Custom matchers
expect(mediaInput).toBeValidMediaInput();
expect(mediaOutput).toBeValidMediaOutput();
```

## 🔍 Debugging Tests

### Debug Configuration

```typescript
// vitest.debug.config.ts
export default defineConfig({
  test: {
    // Enable debugging
    inspect: true,
    inspectBrk: true,
    
    // Increase timeouts for debugging
    testTimeout: 300000,
    
    // Run tests serially for easier debugging
    threads: false,
    
    // Verbose output
    reporter: 'verbose'
  }
});
```

### Debug Utilities

```typescript
// Test debugging helpers
function debugLog(message: string, data?: any) {
  if (process.env.DEBUG_TESTS) {
    console.log(`[DEBUG] ${message}`, data);
  }
}

function createDebugService() {
  const service = new ChatterboxTTSDockerService();
  service.setDebugMode(true);
  return service;
}
```

---

**Next**: [Unit Tests](./unit-tests.md)
