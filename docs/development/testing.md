# 🧪 Testing Guide

AutoMarket employs a comprehensive testing strategy to ensure the reliability, correctness, and performance of its various components, including AI provider integrations, media processing, and core utilities. This guide outlines the testing frameworks and commands used in the project.

## Testing Frameworks

Prizm primarily uses **Vitest** for its testing needs. Vitest is a fast, modern testing framework powered by Vite.

## Test Commands

The `package.json` defines several scripts for running tests:

```json
// package.json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:integration": "vitest run --config vitest.integration.config.ts",
  // ... other scripts
}
```

### `npm test`

Runs all tests in interactive watch mode. This is the default command for local development.

```bash
npm test
```

### `npm run test:ui`

Starts the Vitest UI, providing a graphical interface to view test results, coverage, and interact with tests.

```bash
npm run test:ui
```

### `npm run test:run`

Executes all tests once and exits. This is suitable for CI/CD pipelines or quick, non-interactive runs.

```bash
npm run test:run
```

### `npm run test:coverage`

Runs all tests and generates a code coverage report, helping identify areas of the codebase that lack sufficient test coverage.

```bash
npm run test:coverage
```

### `npm run test:integration`

Runs integration tests specifically. These tests are configured separately using `vitest.integration.config.ts` and typically involve more complex scenarios, such as interactions with external APIs or local Docker services.

```bash
npm run test:integration
```

## Test File Conventions

Tests are typically located alongside the code they test or within a dedicated `tests/` directory. Common conventions include:

*   `*.test.ts`: For unit tests and general tests.
*   `*.integration.test.ts`: For integration tests (though often run via `test:integration` script).

## Writing Tests

When writing new tests or extending existing ones, follow these best practices:

*   **Unit Tests:** Focus on testing individual functions, classes, or modules in isolation. Mock external dependencies (e.g., API calls, file system operations) to ensure tests are fast and reliable.
*   **Integration Tests:** Verify the interaction between multiple components or with external systems (e.g., a provider interacting with its API, or an asset transformation using an FFMPEG Docker service). These tests may require actual network requests or running Docker containers.
*   **Clear Descriptions:** Use `describe` and `it` (or `test`) blocks with descriptive names to clearly articulate what each test suite and individual test case is verifying.
*   **Assertions:** Use Vitest's built-in assertion library (compatible with Jest's `expect` syntax) to make clear and concise assertions about expected outcomes.
*   **Setup and Teardown:** Utilize `beforeEach`, `afterEach`, `beforeAll`, and `afterAll` hooks for setting up test environments (e.g., configuring providers, starting Docker services) and cleaning up resources.

### Example Unit Test Structure

```typescript
// src/media/utils/someUtility.test.ts
import { someUtilityFunction } from './someUtility';

describe('someUtilityFunction', () => {
  it('should correctly process input', () => {
    const input = 'test';
    const result = someUtilityFunction(input);
    expect(result).toBe('processed-test');
  });

  it('should handle empty input', () => {
    const input = '';
    const result = someUtilityFunction(input);
    expect(result).toBe('empty-processed');
  });
});
```

### Example Integration Test Structure

```typescript
// src/media/providers/falai/FalAiProvider.integration.test.ts
import { FalAiProvider } from './FalAiProvider';
import { Text } from '../../assets/roles';

describe('FalAiProvider Integration', () => {
  let provider: FalAiProvider;

  beforeAll(async () => {
    // Ensure API key is set in environment for integration tests
    if (!process.env.FALAI_API_KEY) {
      throw new Error('FALAI_API_KEY environment variable is not set for integration tests.');
    }
    provider = new FalAiProvider();
    await provider.configure({ apiKey: process.env.FALAI_API_KEY });
  });

  it('should create a text-to-image model and transform text to image', async () => {
    const model = await provider.createTextToImageModel('flux-pro');
    const inputText = new Text('A futuristic city at sunset');
    const image = await model.transform(inputText);

    expect(image).toBeDefined();
    expect(image.getMetadata().mimeType).toContain('image');
    // Add more assertions based on expected image properties
  }, 60000); // Increase timeout for API calls
});
```

By following these guidelines, developers can contribute to a robust and well-tested codebase.