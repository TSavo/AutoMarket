# Provider Registry Deep Dive

The `ProviderRegistry` is a core component of Prizm's architecture, acting as a central, singleton hub for managing all available AI `MediaProvider` implementations. It enables dynamic discovery and selection of providers based on their capabilities within the provider→model→transform architecture.

## 🚀 NEW: Dynamic Provider Loading (June 2025)

The `ProviderRegistry` now supports **Go-like module loading** for providers and services from URLs:

```typescript
// Load providers from GitHub repositories
const provider = await registry.getProvider('https://github.com/company/custom-provider');

// Load providers from NPM packages
const provider = await registry.getProvider('@company/ai-provider@2.1.0');

// Load providers from local files
const provider = await registry.getProvider('file:///path/to/provider');
```

### **Dynamic Loading Architecture**

The registry automatically detects dynamic identifiers and loads them:

```typescript
// Static provider (existing behavior)
const provider = await registry.getProvider('fal-ai');

// Dynamic providers (new behavior)
const provider = await registry.getProvider('github:company/provider@v2.1.0');
```

### **Supported URL Formats**
- **GitHub**: `https://github.com/owner/repo` or `github:owner/repo@ref`
- **NPM**: `@scope/package@version` or `npm:package@version`  
- **File**: `file:///absolute/path/to/provider`

### **Dynamic Loading Process**
1. **Repository Cloning**: `git clone --depth 1 --branch {ref} {repo}`
2. **Dependency Installation**: `npm install --production` (if package.json exists)
3. **TypeScript Compilation**: `npx tsc --outDir dist` (if tsconfig.json exists)
4. **Entry Point Detection**: package.json main, dist/index.js, src/index.ts
5. **Provider Validation**: Ensures provider implements MediaProvider interface
6. **Caching**: Provider instances cached for future use
7. **Cleanup**: Temporary files removed after successful load

## `ProviderRegistry` Singleton

The `ProviderRegistry` is implemented as a singleton, ensuring that there is only one instance managing all providers across the SDK.

```typescript
// src/media/registry/ProviderRegistry.ts
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, ProviderConstructor>();

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  // ... other methods
}
```

You can access the singleton instance using `ProviderRegistry.getInstance()`.

## Provider Registration

Providers "self-register" themselves with the `ProviderRegistry` when their respective modules are imported. This typically happens at the end of each `MediaProvider` implementation file.

```typescript
// Example: src/media/providers/falai/FalAiProvider.ts
import { ProviderRegistry } from '../../registry/ProviderRegistry';
// ... other imports and class definition

// Self-register with the provider registry
ProviderRegistry.getInstance().register('fal-ai', FalAiProvider);
```

The `register` method adds the provider's constructor to the registry, associating it with a unique ID.

```typescript
// src/media/registry/ProviderRegistry.ts
public register(id: string, providerClass: ProviderConstructor): void {
  if (this.providers.has(id)) {
    console.warn(`[ProviderRegistry] Provider with ID '${id}' already registered. Overwriting.`);
  }
  this.providers.set(id, providerClass);
  console.log(`[ProviderRegistry] Registered provider: ${id}`);
}
```

## Provider Retrieval and Selection

The `ProviderRegistry` offers several methods to retrieve and select providers:

### `getProvider(id: string)`

Retrieves a specific provider instance by its unique ID.

```typescript
// src/media/registry/ProviderRegistry.ts
public async getProvider(id: string): Promise<MediaProvider> {
  const ProviderClass = this.providers.get(id);
  if (!ProviderClass) {
    throw new ProviderNotFoundError(id);
  }
  // Instantiate the provider if not already cached
  if (!this.providerInstances.has(id)) {
    this.providerInstances.set(id, new ProviderClass());
  }
  return this.providerInstances.get(id)!;
}
```

### `getProviders()`

Returns an array of all registered `MediaProvider` instances.

```typescript
// src/media/registry/ProviderRegistry.ts
public async getProviders(): Promise<MediaProvider[]> {
  const providerInstances: MediaProvider[] = [];
  for (const [id, ProviderClass] of this.providers.entries()) {
    // Ensure all providers are instantiated and cached
    if (!this.providerInstances.has(id)) {
      this.providerInstances.set(id, new ProviderClass());
    }
    providerInstances.push(this.providerInstances.get(id)!);
  }
  return providerInstances;
}
```

### `getProvidersByCapability(capability: MediaCapability)`

Filters and returns providers that support a specific `MediaCapability` (e.g., `MediaCapability.TEXT_TO_IMAGE`).

```typescript
// src/media/registry/ProviderRegistry.ts
public async getProvidersByCapability(capability: MediaCapability): Promise<MediaProvider[]> {
  const allProviders = await this.getProviders();
  return allProviders.filter(provider => provider.capabilities.includes(capability));
}
```

### `findBestProvider(capability: MediaCapability, criteria?: ProviderCriteria)`

Intelligently selects the most suitable provider based on a desired capability and optional criteria (e.g., cost, speed, specific model features). This method is crucial for Prizm's cost optimization and intelligent routing.

```typescript
// src/media/registry/ProviderRegistry.ts
public async findBestProvider(capability: MediaCapability, criteria?: ProviderCriteria): Promise<MediaProvider | null> {
  const eligibleProviders = await this.getProvidersByCapability(capability);

  if (eligibleProviders.length === 0) {
    return null;
  }

  // TODO: Implement sophisticated selection logic based on criteria (cost, speed, features, etc.)
  // For now, a simple selection (e.g., first available) or more advanced logic can be applied here.
  // This is where intelligent routing decisions are made.

  // Example: Prioritize providers with 'free' models if criteria suggests cost-effectiveness
  if (criteria?.costPreference === 'free') {
    for (const provider of eligibleProviders) {
      const models = await provider.getModels();
      if (models.some(model => model.isFree)) {
        return provider;
      }
    }
  }

  // Fallback to the first eligible provider if no specific criteria met
  return eligibleProviders[0];
}
```

## Initialization (`src/media/registry/bootstrap.ts`)

The `bootstrap.ts` file is responsible for initializing the `ProviderRegistry` and providing convenience functions for interacting with it. Importing this file ensures that all providers (which self-register on import) are known to the system.

```typescript
// src/media/registry/bootstrap.ts
import { ProviderRegistry } from './ProviderRegistry';
// ... import all provider modules here to ensure they self-register

export async function initializeProviders(): Promise<void> {
  console.log('🏗️ Initializing provider registry...');
  const registry = ProviderRegistry.getInstance();
  // Providers are registered as their modules are imported.
  // This function primarily logs the status and ensures the singleton is accessed.
  const stats = registry.getStats();
  console.log(`✅ Provider registry initialized:`);
  console.log(`   Registered: ${stats.totalProviders} providers`);
  console.log(`   Available: ${registry.getAvailableProviders().join(', ')}`);
}

// Convenience functions for accessing the registry
export { ProviderRegistry } from './ProviderRegistry';
export function getProvider(id: string) { /* ... */ }
export function getProviders() { /* ... */ }
// ... and others
```

This setup ensures that Prizm can dynamically manage and utilize a wide array of AI providers and their capabilities in a flexible and extensible manner.

## 🔄 Provider → Service Dynamic Loading

Providers can now dynamically load and manage their service dependencies through the `ProviderConfig.serviceUrl` field:

```typescript
// Provider configuration with dynamic service loading
await provider.configure({
  // Service from GitHub repository
  serviceUrl: 'https://github.com/company/enhanced-ffmpeg-service',
  
  // Service configuration
  serviceConfig: {
    enableGPU: true,
    maxConcurrent: 4,
    memory: '8GB'
  },
  
  // Automatic service management
  autoStartService: true
});
```

### **Service Loading Process**
1. **Service Registry Lookup**: Uses `ServiceRegistry.getInstance().getService()`
2. **Dynamic Loading**: Same GitHub/NPM/file loading as providers
3. **Service Startup**: Automatically starts Docker services if `autoStartService: true`
4. **Health Checking**: Waits for service to become healthy
5. **Provider Auto-Configuration**: Extracts service port info and configures provider baseUrl
6. **Lifecycle Management**: Provider manages service lifecycle

### **Benefits**
- **🔄 Dynamic Dependencies**: Providers specify exact service needs
- **📦 Decentralized Services**: Services distributed via GitHub/NPM
- **🔧 Auto-Configuration**: Provider automatically configures from service info
- **🚀 Zero-Setup**: Just specify URL, everything else automatic
- **🔒 Service Isolation**: Each provider can use different service versions

### **Use Cases**
```typescript
// AI Provider with GPU-optimized service
await aiProvider.configure({
  serviceUrl: 'github:nvidia/tensorrt-service@v8.2.0',
  serviceConfig: { gpuMemory: '24GB' }
});

// Different environments
await provider.configure({
  serviceUrl: process.env.NODE_ENV === 'production' 
    ? '@company/prod-service@2.0.0'
    : 'github:company/dev-service@main'
});
```
