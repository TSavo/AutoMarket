/**
 * ProviderRegistry Implementation
 * 
 * Central registry for provider instances in the Model-Registry architecture.
 * Manages provider lifecycle and provides intelligent provider selection.
 */

import {
  Provider,
  ProviderRegistry,
  ProviderError,
  ProviderNotFoundError
} from './types';
import { modelRegistry } from './ModelRegistry';

/**
 * Default implementation of ProviderRegistry
 * 
 * Thread-safe registry for managing provider instances.
 * Providers register themselves and can be queried by type, model support, etc.
 */
export class DefaultProviderRegistry implements ProviderRegistry {
  private readonly providers = new Map<string, Provider>();
  private readonly registryLock = new Set<string>(); // Simple lock mechanism

  /**
   * Register a provider instance
   */
  register(provider: Provider): void {
    const lockKey = provider.id;
    
    // Simple lock mechanism for thread safety
    if (this.registryLock.has(lockKey)) {
      throw new ProviderError(
        `Registration in progress for provider '${provider.id}'`,
        provider.id
      );
    }

    try {
      this.registryLock.add(lockKey);

      if (this.providers.has(provider.id)) {
        console.warn(
          `Overwriting existing registration for provider '${provider.id}'`
        );
      }

      this.providers.set(provider.id, provider);
      
      console.log(
        `✅ Registered provider '${provider.id}' (${provider.name}) - Type: ${provider.type}`
      );

    } finally {
      this.registryLock.delete(lockKey);
    }
  }

  /**
   * Unregister a provider
   */
  unregister(providerId: string): void {
    const lockKey = providerId;
    
    if (this.registryLock.has(lockKey)) {
      throw new ProviderError(
        `Operation in progress for provider '${providerId}'`,
        providerId
      );
    }

    try {
      this.registryLock.add(lockKey);

      if (!this.providers.has(providerId)) {
        throw new ProviderNotFoundError(providerId);
      }

      this.providers.delete(providerId);
      
      console.log(`❌ Unregistered provider '${providerId}'`);

    } finally {
      this.registryLock.delete(lockKey);
    }
  }

  /**
   * Get a provider instance
   */
  getProvider(providerId: string): Provider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getProviders(): Provider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Find providers by type or capabilities
   */
  findProviders(criteria: {
    type?: 'local' | 'remote';
    supportsModel?: string;
    available?: boolean;
  }): Provider[] {
    let candidates = Array.from(this.providers.values());

    // Filter by type
    if (criteria.type) {
      candidates = candidates.filter(provider => provider.type === criteria.type);
    }

    // Filter by model support
    if (criteria.supportsModel) {
      candidates = candidates.filter(provider => 
        provider.supportsModel(criteria.supportsModel!)
      );
    }

    // Filter by availability (async check would need to be done separately)
    // For now, we just return the candidates
    // TODO: Add async version of this method for availability checking

    return candidates;
  }

  /**
   * Find providers that support a specific model
   */
  getProvidersForModel(modelId: string): Provider[] {
    return this.findProviders({ supportsModel: modelId });
  }

  /**
   * Find providers by type
   */
  getProvidersByType(type: 'local' | 'remote'): Provider[] {
    return this.findProviders({ type });
  }

  /**
   * Get all local providers
   */
  getLocalProviders(): Provider[] {
    return this.getProvidersByType('local');
  }

  /**
   * Get all remote providers
   */
  getRemoteProviders(): Provider[] {
    return this.getProvidersByType('remote');
  }

  /**
   * Find the best provider for a model based on criteria
   */
  async findBestProvider(
    modelId: string,
    criteria: {
      preferLocal?: boolean;
      excludeProviders?: string[];
      requireAvailable?: boolean;
    } = {}
  ): Promise<Provider | undefined> {
    // Get all providers that support this model
    let candidates = this.getProvidersForModel(modelId);

    // Filter out excluded providers
    if (criteria.excludeProviders) {
      candidates = candidates.filter(provider => 
        !criteria.excludeProviders!.includes(provider.id)
      );
    }

    if (candidates.length === 0) {
      return undefined;
    }

    // Check availability if required
    if (criteria.requireAvailable) {
      const availableCandidates: Provider[] = [];
      for (const provider of candidates) {
        try {
          const isAvailable = await provider.isAvailable();
          if (isAvailable) {
            availableCandidates.push(provider);
          }
        } catch (error) {
          console.warn(`Failed to check availability for provider ${provider.id}:`, error);
        }
      }
      candidates = availableCandidates;
    }

    if (candidates.length === 0) {
      return undefined;
    }

    // Sort by preference (local first if preferred)
    if (criteria.preferLocal) {
      candidates.sort((a, b) => {
        if (a.type === 'local' && b.type !== 'local') return -1;
        if (a.type !== 'local' && b.type === 'local') return 1;
        return 0;
      });
    }

    return candidates[0];
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalProviders: number;
    localProviders: number;
    remoteProviders: number;
    providersByModel: Record<string, string[]>;
    modelsByProvider: Record<string, string[]>;
  } {
    const providers = this.getProviders();
    const localProviders = this.getLocalProviders();
    const remoteProviders = this.getRemoteProviders();

    // Get all models from the model registry
    const allModels = modelRegistry.getAllModels();
    
    const providersByModel: Record<string, string[]> = {};
    const modelsByProvider: Record<string, string[]> = {};

    // Build provider-model mappings
    for (const model of allModels) {
      const providersForModel = this.getProvidersForModel(model);
      providersByModel[model] = providersForModel.map(p => p.id);
    }

    for (const provider of providers) {
      modelsByProvider[provider.id] = provider.getSupportedModels();
    }

    return {
      totalProviders: providers.length,
      localProviders: localProviders.length,
      remoteProviders: remoteProviders.length,
      providersByModel,
      modelsByProvider
    };
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.providers.clear();
    this.registryLock.clear();
  }

  /**
   * Get debug information about the registry state
   */
  debug(): {
    providers: Array<{
      id: string;
      name: string;
      type: 'local' | 'remote';
      supportedModels: string[];
    }>;
    locks: string[];
  } {
    const providers = Array.from(this.providers.values()).map(provider => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      supportedModels: provider.getSupportedModels()
    }));

    return {
      providers,
      locks: Array.from(this.registryLock)
    };
  }
}

/**
 * Global provider registry instance
 */
export const providerRegistry = new DefaultProviderRegistry();

/**
 * Convenience function for registering providers
 */
export function registerProvider(provider: Provider): void {
  providerRegistry.register(provider);
}

/**
 * Convenience function for getting providers
 */
export function getProvider(providerId: string): Provider | undefined {
  return providerRegistry.getProvider(providerId);
}
