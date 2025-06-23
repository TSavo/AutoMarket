/**
 * Provider Registry for Elegant Provider Management
 * 
 * Implements the singleton pattern with constructor-based registration
 * for lazy instantiation and auto-configuration of providers.
 */

import { MediaProvider, MediaCapability } from '../types/provider';

/**
 * Provider constructor type
 */
export type ProviderConstructor = new () => MediaProvider;

/**
 * Error thrown when a provider is not found
 */
export class ProviderNotFoundError extends Error {
  constructor(id: string) {
    super(`Provider '${id}' not found in registry`);
    this.name = 'ProviderNotFoundError';
  }
}

/**
 * Error thrown when a provider cannot be created
 */
export class ProviderCreationError extends Error {
  constructor(id: string, reason: string) {
    super(`Failed to create provider '${id}': ${reason}`);
    this.name = 'ProviderCreationError';
  }
}

/**
 * Provider Registry - Singleton for managing provider constructors
 * 
 * Supports:
 * - Lazy instantiation via constructors
 * - Auto-configuration from environment
 * - Error handling and graceful fallbacks
 * - Type-safe provider access
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers = new Map<string, ProviderConstructor>();
  private providerCache = new Map<string, MediaProvider>();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register a provider constructor
   */
  public register(id: string, providerClass: ProviderConstructor): void {
    this.providers.set(id, providerClass);
  }

  /**
   * Get available provider IDs
   */
  public getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered
   */
  public hasProvider(id: string): boolean {
    return this.providers.has(id);
  }

  /**
   * Get a provider by ID with lazy instantiation
   */
  public async getProvider(id: string): Promise<MediaProvider> {
    // Check cache first
    const cached = this.providerCache.get(id);
    if (cached) {
      return cached;
    }

    // Get constructor
    const ProviderClass = this.providers.get(id);
    if (!ProviderClass) {
      throw new ProviderNotFoundError(id);
    }    try {
      // Create provider instance
      const provider = new ProviderClass();
      
      // Cache for future use
      this.providerCache.set(id, provider);
      
      return provider;
    } catch (error) {
      throw new ProviderCreationError(id, error instanceof Error ? error.message : String(error));
    }
  }
  /**
   * Get providers by capability with priority ordering
   */  public async getProvidersByCapability(capability: MediaCapability): Promise<MediaProvider[]> {
    const providers: MediaProvider[] = [];

    // Define priority order for text-to-image providers
    const textToImagePriority = [
      'huggingface-docker', // #1 Priority - Dynamic model loading
      'falai',
      'together',
      'replicate'
    ];

    // For TEXT_TO_IMAGE capability, use priority order
    if (capability === MediaCapability.TEXT_TO_IMAGE) {
      // First, add providers in priority order
      for (const priorityId of textToImagePriority) {
        if (this.providers.has(priorityId)) {
          try {
            const provider = await this.getProvider(priorityId);
            if (provider.capabilities && provider.capabilities.includes(capability)) {
              providers.push(provider);
            }
          } catch (error) {
            console.warn(`Failed to create priority provider ${priorityId}:`, error);
          }
        }
      }

      // Then add any remaining providers not in priority list
      for (const [id] of Array.from(this.providers)) {
        if (!textToImagePriority.includes(id)) {
          try {
            const provider = await this.getProvider(id);
            if (provider.capabilities && provider.capabilities.includes(capability)) {
              providers.push(provider);
            }
          } catch (error) {
            console.warn(`Failed to create provider ${id}:`, error);
          }
        }
      }
    } else {
      // For other capabilities, use default order
      for (const [id] of Array.from(this.providers)) {
        try {
          const provider = await this.getProvider(id);
          if (provider.capabilities && provider.capabilities.includes(capability)) {
            providers.push(provider);
          }
        } catch (error) {
          console.warn(`Failed to create provider ${id}:`, error);
        }
      }
    }

    return providers;
  }

  /**
   * Get all providers as instances (for compatibility with old API)
   */
  public async getProviders(): Promise<MediaProvider[]> {
    const providers: MediaProvider[] = [];
    
    for (const [id] of Array.from(this.providers)) {
      try {
        const provider = await this.getProvider(id);
        providers.push(provider);
      } catch (error) {
        console.warn(`Failed to create provider ${id}:`, error);
      }
    }
    
    return providers;
  }

  /**
   * Find the best provider for a capability based on availability and criteria
   */
  public async findBestProvider(capability: MediaCapability, criteria?: {
    maxCost?: number;
    preferLocal?: boolean;
    excludeProviders?: string[];
  }): Promise<MediaProvider | undefined> {
    const providers = await this.getProvidersByCapability(capability);

    if (criteria?.excludeProviders) {
      const filtered = providers.filter(p => !criteria.excludeProviders!.includes(p.id));
      if (filtered.length > 0) return filtered[0];
    }

    // Special handling for text-to-image: prefer HuggingFace if available
    if (capability === MediaCapability.TEXT_TO_IMAGE) {
      const hfProvider = providers.find(p => p.id === 'huggingface-docker');
      if (hfProvider && await hfProvider.isAvailable()) {
        return hfProvider;
      }
    }

    if (criteria?.preferLocal) {
      const localProvider = providers.find(p => p.type === 'local');
      if (localProvider) return localProvider;
    }

    return providers[0]; // Return first available (already prioritized)
  }

  /**
   * Clear the provider cache
   */
  public clearCache(): void {
    this.providerCache.clear();
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalProviders: number;
    cachedProviders: number;
  } {
    return {
      totalProviders: this.providers.size,
      cachedProviders: this.providerCache.size
    };
  }
}

/**
 * Convenience function to get the registry instance
 */
export function getProviderRegistry(): ProviderRegistry {
  return ProviderRegistry.getInstance();
}

export default ProviderRegistry;
