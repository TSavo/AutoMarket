/**
 * Base Provider Classes
 * 
 * Abstract base classes for implementing providers in the Model-Registry architecture.
 * Provides common functionality and enforces the provider contract.
 */

import {
  Provider,
  ModelImplementation,
  ModelDescriptor,
  ProviderError
} from './types';
import { modelRegistry } from './ModelRegistry';

/**
 * Abstract base class for all providers
 * 
 * Provides common functionality like model lookup, validation, and error handling.
 * Concrete providers extend this and implement provider-specific logic.
 */
export abstract class BaseProvider implements Provider {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: 'local' | 'remote';

  /**
   * Get a model implementation from this provider
   */
  async getModel(modelId: string): Promise<ModelImplementation> {
    // Check if we support this model
    if (!this.supportsModel(modelId)) {
      throw new ProviderError(
        `Provider '${this.id}' does not support model '${modelId}'`,
        this.id
      );
    }

    // Get the model descriptor from the registry
    const descriptor = modelRegistry.getModelDescriptor(modelId, this.id);
    if (!descriptor) {
      throw new ProviderError(
        `Model '${modelId}' not registered with provider '${this.id}'`,
        this.id
      );
    }

    // Create the model implementation
    try {
      const providerContext = await this.getProviderContext();
      const modelImpl = new descriptor.implementation(providerContext, descriptor);
      return modelImpl;
    } catch (error) {
      throw new ProviderError(
        `Failed to create model '${modelId}' for provider '${this.id}': ${error}`,
        this.id
      );
    }
  }

  /**
   * Check if provider supports a specific model
   */
  supportsModel(modelId: string): boolean {
    const descriptor = modelRegistry.getModelDescriptor(modelId, this.id);
    return descriptor !== undefined;
  }

  /**
   * Get list of models supported by this provider
   */
  getSupportedModels(): string[] {
    return modelRegistry.getModelsForProvider(this.id);
  }

  /**
   * Get provider status and information
   */
  getInfo(): {
    id: string;
    name: string;
    type: 'local' | 'remote';
    status: 'available' | 'unavailable' | 'error';
    supportedModels: string[];
  } {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: 'available', // Override in subclasses for real status
      supportedModels: this.getSupportedModels()
    };
  }

  /**
   * Abstract method to get provider-specific context
   * This is passed to model implementations for their use
   */
  protected abstract getProviderContext(): Promise<any>;

  /**
   * Abstract method to check if provider is available/healthy
   */
  abstract isAvailable(): Promise<boolean>;
}

/**
 * Base class for local providers (Docker-based services)
 * 
 * Provides common Docker service management functionality.
 */
export abstract class LocalProvider extends BaseProvider {
  readonly type = 'local' as const;

  /**
   * Get Docker service context for model implementations
   */
  protected async getProviderContext(): Promise<{
    dockerService: any;
    apiClient: any;
  }> {
    return {
      dockerService: await this.getDockerService(),
      apiClient: await this.getAPIClient()
    };
  }

  /**
   * Abstract method to get Docker service manager
   */
  protected abstract getDockerService(): Promise<any>;

  /**
   * Abstract method to get API client for the service
   */
  protected abstract getAPIClient(): Promise<any>;

  /**
   * Check if local service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const dockerService = await this.getDockerService();
      return await dockerService.isServiceHealthy();
    } catch (error) {
      console.warn(`Local provider ${this.id} availability check failed:`, error);
      return false;
    }
  }
}

/**
 * Base class for remote providers (API-based services)
 * 
 * Provides common API client functionality and credential management.
 */
export abstract class RemoteProvider extends BaseProvider {
  readonly type = 'remote' as const;

  protected apiKey?: string;
  protected baseUrl?: string;

  /**
   * Configure the provider with API credentials
   */
  configure(config: {
    apiKey?: string;
    baseUrl?: string;
    [key: string]: any;
  }): void {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.onConfigure(config);
  }

  /**
   * Hook for subclasses to handle additional configuration
   */
  protected onConfigure(config: Record<string, any>): void {
    // Override in subclasses if needed
  }

  /**
   * Get API client context for model implementations
   */
  protected async getProviderContext(): Promise<{
    apiClient: any;
    config: {
      apiKey?: string;
      baseUrl?: string;
    };
  }> {
    return {
      apiClient: await this.getAPIClient(),
      config: {
        apiKey: this.apiKey,
        baseUrl: this.baseUrl
      }
    };
  }

  /**
   * Abstract method to get API client for the service
   */
  protected abstract getAPIClient(): Promise<any>;

  /**
   * Check if remote service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }
      
      const apiClient = await this.getAPIClient();
      return await this.checkAPIHealth(apiClient);
    } catch (error) {
      console.warn(`Remote provider ${this.id} availability check failed:`, error);
      return false;
    }
  }

  /**
   * Abstract method to check API health
   */
  protected abstract checkAPIHealth(apiClient: any): Promise<boolean>;
}

/**
 * Utility function to create a provider registration helper
 */
export function createProviderRegistration<T extends Provider>(
  ProviderClass: new (...args: any[]) => T,
  config?: any
): () => T {
  return () => {
    const provider = new ProviderClass(config);
    return provider;
  };
}

/**
 * Utility function to register multiple providers at once
 */
export async function registerProviders(providers: Provider[]): Promise<void> {
  const { providerRegistry } = await import('./ProviderRegistry');
  
  for (const provider of providers) {
    try {
      const isAvailable = await provider.isAvailable();
      if (isAvailable) {
        providerRegistry.register(provider);
        console.log(`✅ Registered provider: ${provider.name} (${provider.id})`);
      } else {
        console.warn(`⚠️  Provider ${provider.name} is not available, skipping registration`);
      }
    } catch (error) {
      console.error(`❌ Failed to register provider ${provider.name}:`, error);
    }
  }
}
