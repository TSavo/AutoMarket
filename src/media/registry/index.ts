/**
 * Model-Registry System - Main Exports
 * 
 * Central export point for the Model-Registry architecture.
 * Provides all interfaces, implementations, and utilities needed
 * to implement the provider-model pattern.
 */

// Core interfaces and types
export {
  MediaType,
  MediaData,
  ModelInputSchema,
  ModelOutputSchema,
  ModelImplementation,
  ModelImplementationConstructor,
  ModelDescriptor,
  Provider,
  ModelRegistry,
  ProviderRegistry,
  GetProviderFunction
} from './types';

// Error types
export {
  ModelRegistryError,
  ProviderError,
  ModelNotFoundError,
  ProviderNotFoundError
} from './types';

// ModelRegistry implementation and utilities
export {
  DefaultModelRegistry,
  modelRegistry,
  registerModel,
  getModelDescriptor
} from './ModelRegistry';

// ProviderRegistry implementation and utilities
export {
  DefaultProviderRegistry,
  providerRegistry,
  registerProvider,
  getProvider
} from './ProviderRegistry';

// Base provider classes
export {
  BaseProvider,
  LocalProvider,
  RemoteProvider,
  createProviderRegistration,
  registerProviders
} from './BaseProvider';

/**
 * Convenience function to get a model from a provider
 * 
 * This is the main user-facing API for the Model-Registry pattern:
 * getProvider("openai").getModel("whisper-stt").transform(audio)
 */
export async function getProviderModel(providerId: string, modelId: string) {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Provider '${providerId}' not found`);
  }
  
  return await provider.getModel(modelId);
}

/**
 * Convenience function to check if a provider-model combination exists
 */
export function hasProviderModel(providerId: string, modelId: string): boolean {
  const provider = getProvider(providerId);
  if (!provider) {
    return false;
  }
  
  return provider.supportsModel(modelId);
}

/**
 * Get all available provider-model combinations
 */
export function getAllProviderModels(): Array<{
  providerId: string;
  providerName: string;
  providerType: 'local' | 'remote';
  modelId: string;
  modelName: string;
}> {
  const { providerRegistry, modelRegistry } = require('./ProviderRegistry');
  const providers = providerRegistry.getProviders();
  const combinations: Array<{
    providerId: string;
    providerName: string;
    providerType: 'local' | 'remote';
    modelId: string;
    modelName: string;
  }> = [];

  for (const provider of providers) {
    const supportedModels = provider.getSupportedModels();
    for (const modelId of supportedModels) {
      const descriptor = modelRegistry.getModelDescriptor(modelId, provider.id);
      if (descriptor) {
        combinations.push({
          providerId: provider.id,
          providerName: provider.name,
          providerType: provider.type,
          modelId: modelId,
          modelName: descriptor.name
        });
      }
    }
  }

  return combinations;
}

/**
 * Initialize the registry system with default configuration
 */
export async function initializeRegistry(): Promise<{
  modelRegistry: ModelRegistry;
  providerRegistry: ProviderRegistry;
}> {
  // The registries are already initialized as singletons
  return {
    modelRegistry,
    providerRegistry
  };
}

/**
 * Clear all registrations (useful for testing)
 */
export function clearRegistries(): void {
  modelRegistry.clear();
  providerRegistry.clear();
}

/**
 * Get comprehensive registry statistics
 */
export function getRegistryStats(): {
  models: {
    total: number;
    byProvider: Record<string, number>;
  };
  providers: {
    total: number;
    local: number;
    remote: number;
    byModel: Record<string, string[]>;
  };
  combinations: number;
} {
  const modelStats = modelRegistry.getStats();
  const providerStats = providerRegistry.getStats();
  const combinations = getAllProviderModels();

  return {
    models: {
      total: modelStats.totalModels,
      byProvider: modelStats.modelsByProvider
    },
    providers: {
      total: providerStats.totalProviders,
      local: providerStats.localProviders,
      remote: providerStats.remoteProviders,
      byModel: providerStats.providersByModel
    },
    combinations: combinations.length
  };
}
