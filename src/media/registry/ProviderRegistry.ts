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
   * Get providers by capability
   */
  public async getProvidersByCapability(capability: MediaCapability): Promise<MediaProvider[]> {
    const providers: MediaProvider[] = [];
    
    for (const [id] of this.providers) {
      try {
        const provider = await this.getProvider(id);
        if (provider.capabilities && provider.capabilities.includes(capability)) {
          providers.push(provider);
        }
      } catch (error) {
        // Silently skip providers that fail to create
        console.warn(`Failed to create provider ${id}:`, error);
      }
    }
    
    return providers;
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
