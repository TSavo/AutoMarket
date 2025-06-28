# Provider Registry Deep Dive

The `ProviderRegistry` is a core component of Prizm's architecture, acting as a central, singleton hub for managing all available AI `MediaProvider` implementations. It enables dynamic discovery and selection of providers based on their capabilities within the provider→model→transform architecture.

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
