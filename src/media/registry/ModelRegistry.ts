/**
 * ModelRegistry Implementation
 * 
 * Central registry for model-provider mappings. Allows models to self-register
 * with providers without hardcoding support in provider classes.
 */

import {
  ModelRegistry,
  ModelDescriptor,
  MediaType,
  ModelRegistryError,
  ModelNotFoundError
} from './types';

/**
 * Default implementation of ModelRegistry
 * 
 * Thread-safe registry for managing model-provider relationships.
 * Models self-register with descriptors containing implementation details.
 */
export class DefaultModelRegistry implements ModelRegistry {
  private readonly models = new Map<string, Map<string, ModelDescriptor>>();
  private readonly registryLock = new Set<string>(); // Simple lock mechanism

  /**
   * Register a model implementation with a provider
   */
  register(descriptor: ModelDescriptor): void {
    const validation = this.validateDescriptor(descriptor);
    if (!validation.valid) {
      throw new ModelRegistryError(
        `Invalid model descriptor: ${validation.errors.join(', ')}`,
        'INVALID_DESCRIPTOR'
      );
    }

    const lockKey = `${descriptor.modelId}:${descriptor.providerId}`;
    
    // Simple lock mechanism for thread safety
    if (this.registryLock.has(lockKey)) {
      throw new ModelRegistryError(
        `Registration in progress for ${descriptor.modelId} with ${descriptor.providerId}`,
        'REGISTRATION_IN_PROGRESS'
      );
    }

    try {
      this.registryLock.add(lockKey);

      if (!this.models.has(descriptor.modelId)) {
        this.models.set(descriptor.modelId, new Map());
      }

      const modelProviders = this.models.get(descriptor.modelId)!;
      
      if (modelProviders.has(descriptor.providerId)) {
        console.warn(
          `Overwriting existing registration for model '${descriptor.modelId}' ` +
          `with provider '${descriptor.providerId}'`
        );
      }

      modelProviders.set(descriptor.providerId, { ...descriptor });
      
      console.log(
        `✅ Registered model '${descriptor.modelId}' with provider '${descriptor.providerId}'`
      );

    } finally {
      this.registryLock.delete(lockKey);
    }
  }

  /**
   * Unregister a model from a provider
   */
  unregister(modelId: string, providerId: string): void {
    const lockKey = `${modelId}:${providerId}`;
    
    if (this.registryLock.has(lockKey)) {
      throw new ModelRegistryError(
        `Operation in progress for ${modelId} with ${providerId}`,
        'OPERATION_IN_PROGRESS'
      );
    }

    try {
      this.registryLock.add(lockKey);

      const modelProviders = this.models.get(modelId);
      if (!modelProviders || !modelProviders.has(providerId)) {
        throw new ModelNotFoundError(modelId, providerId);
      }

      modelProviders.delete(providerId);
      
      // Clean up empty model entries
      if (modelProviders.size === 0) {
        this.models.delete(modelId);
      }

      console.log(
        `❌ Unregistered model '${modelId}' from provider '${providerId}'`
      );

    } finally {
      this.registryLock.delete(lockKey);
    }
  }

  /**
   * Get model descriptor for a specific provider
   */
  getModelDescriptor(modelId: string, providerId: string): ModelDescriptor | undefined {
    const modelProviders = this.models.get(modelId);
    return modelProviders?.get(providerId);
  }

  /**
   * Get all descriptors for a model across all providers
   */
  getModelDescriptors(modelId: string): ModelDescriptor[] {
    const modelProviders = this.models.get(modelId);
    if (!modelProviders) {
      return [];
    }
    return Array.from(modelProviders.values());
  }

  /**
   * Get all models supported by a provider
   */
  getModelsForProvider(providerId: string): string[] {
    const models: string[] = [];
    
    for (const [modelId, providers] of this.models.entries()) {
      if (providers.has(providerId)) {
        models.push(modelId);
      }
    }
    
    return models.sort();
  }

  /**
   * Get all providers that support a model
   */
  getProvidersForModel(modelId: string): string[] {
    const modelProviders = this.models.get(modelId);
    if (!modelProviders) {
      return [];
    }
    return Array.from(modelProviders.keys()).sort();
  }

  /**
   * Get all registered models
   */
  getAllModels(): string[] {
    return Array.from(this.models.keys()).sort();
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): string[] {
    const providers = new Set<string>();
    
    for (const modelProviders of this.models.values()) {
      for (const providerId of modelProviders.keys()) {
        providers.add(providerId);
      }
    }
    
    return Array.from(providers).sort();
  }

  /**
   * Find models by capabilities or metadata
   */
  findModels(criteria: {
    inputType?: MediaType;
    outputType?: MediaType;
    category?: string;
    tags?: string[];
    provider?: string;
  }): ModelDescriptor[] {
    const results: ModelDescriptor[] = [];

    for (const [modelId, providers] of this.models.entries()) {
      for (const [providerId, descriptor] of providers.entries()) {
        // Filter by provider if specified
        if (criteria.provider && providerId !== criteria.provider) {
          continue;
        }

        // Filter by category if specified
        if (criteria.category && descriptor.metadata?.category !== criteria.category) {
          continue;
        }

        // Filter by tags if specified
        if (criteria.tags && criteria.tags.length > 0) {
          const modelTags = descriptor.metadata?.tags || [];
          const hasAllTags = criteria.tags.every(tag => modelTags.includes(tag));
          if (!hasAllTags) {
            continue;
          }
        }

        // TODO: Filter by input/output types once we implement schema analysis
        // This would require parsing the inputSchema and outputSchema

        results.push(descriptor);
      }
    }

    return results;
  }

  /**
   * Validate a model descriptor before registration
   */
  validateDescriptor(descriptor: ModelDescriptor): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields validation
    if (!descriptor.modelId) {
      errors.push('modelId is required');
    }
    if (!descriptor.providerId) {
      errors.push('providerId is required');
    }
    if (!descriptor.name) {
      errors.push('name is required');
    }
    if (!descriptor.description) {
      errors.push('description is required');
    }
    if (!descriptor.version) {
      errors.push('version is required');
    }
    if (!descriptor.implementation) {
      errors.push('implementation is required');
    }
    if (!descriptor.inputSchema) {
      errors.push('inputSchema is required');
    }
    if (!descriptor.outputSchema) {
      errors.push('outputSchema is required');
    }

    // Format validation
    if (descriptor.modelId && !/^[a-z0-9-]+$/.test(descriptor.modelId)) {
      errors.push('modelId must contain only lowercase letters, numbers, and hyphens');
    }
    if (descriptor.providerId && !/^[a-z0-9-]+$/.test(descriptor.providerId)) {
      errors.push('providerId must contain only lowercase letters, numbers, and hyphens');
    }

    // Version format validation (semver-like)
    if (descriptor.version && !/^\d+\.\d+\.\d+/.test(descriptor.version)) {
      errors.push('version must follow semantic versioning (e.g., 1.0.0)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalModels: number;
    totalProviders: number;
    modelsByProvider: Record<string, number>;
    providersByType: Record<'local' | 'remote', number>;
  } {
    const providers = this.getAllProviders();
    const modelsByProvider: Record<string, number> = {};
    const providersByType: Record<'local' | 'remote', number> = { local: 0, remote: 0 };

    // Count models by provider
    for (const provider of providers) {
      modelsByProvider[provider] = this.getModelsForProvider(provider).length;
    }

    // Count providers by type (requires looking at descriptors)
    const providerTypes = new Set<string>();
    for (const modelProviders of this.models.values()) {
      for (const [providerId, descriptor] of modelProviders.entries()) {
        if (!providerTypes.has(providerId)) {
          providerTypes.add(providerId);
          // Infer type from provider ID for now
          // Docker providers are local, others are remote
          if (providerId.includes('docker')) {
            providersByType.local++;
          } else {
            providersByType.remote++;
          }
        }
      }
    }

    return {
      totalModels: this.getAllModels().length,
      totalProviders: providers.length,
      modelsByProvider,
      providersByType
    };
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.models.clear();
    this.registryLock.clear();
  }

  /**
   * Get debug information about the registry state
   */
  debug(): {
    registrations: Array<{
      modelId: string;
      providerId: string;
      name: string;
      version: string;
    }>;
    locks: string[];
  } {
    const registrations: Array<{
      modelId: string;
      providerId: string;
      name: string;
      version: string;
    }> = [];

    for (const [modelId, providers] of this.models.entries()) {
      for (const [providerId, descriptor] of providers.entries()) {
        registrations.push({
          modelId,
          providerId,
          name: descriptor.name,
          version: descriptor.version
        });
      }
    }

    return {
      registrations,
      locks: Array.from(this.registryLock)
    };
  }
}

/**
 * Global model registry instance
 */
export const modelRegistry = new DefaultModelRegistry();

/**
 * Convenience function for registering models
 */
export function registerModel(descriptor: ModelDescriptor): void {
  modelRegistry.register(descriptor);
}

/**
 * Convenience function for getting model descriptors
 */
export function getModelDescriptor(modelId: string, providerId: string): ModelDescriptor | undefined {
  return modelRegistry.getModelDescriptor(modelId, providerId);
}
