/**
 * Model Registry System - Core Interfaces
 * 
 * Defines the type system for the model-registry architecture where:
 * - Models define input/output interfaces and transformation capabilities
 * - Providers implement models using their specific APIs/services
 * - Models self-register with providers they support
 * - Users get full control: getProvider("replicate").getModel("flux").transform(input)
 */

/**
 * Media types supported by the system
 */
export type MediaType = 'text' | 'audio' | 'image' | 'video';

/**
 * Media data with optional metadata
 */
export interface MediaData {
  type: MediaType;
  data: string | Buffer | ArrayBuffer;
  metadata?: Record<string, any>;
}

/**
 * Base interface for all model input schemas
 */
export interface ModelInputSchema {
  [key: string]: {
    type: string;
    required: boolean;
    description?: string;
    default?: any;
    validation?: {
      min?: number;
      max?: number;
      pattern?: string;
      enum?: any[];
    };
  };
}

/**
 * Base interface for all model output schemas
 */
export interface ModelOutputSchema {
  [key: string]: {
    type: string;
    description?: string;
  };
}

/**
 * Model implementation interface
 * All model implementations must conform to this
 */
export interface ModelImplementation {
  /**
   * Transform input media according to model's capabilities
   */
  transform(input: Record<string, any>): Promise<Record<string, any>>;
  
  /**
   * Validate input conforms to model's schema
   */
  validateInput(input: Record<string, any>): boolean;
  
  /**
   * Get model configuration/status
   */
  getInfo(): {
    modelId: string;
    providerId: string;
    status: 'available' | 'unavailable' | 'error';
    version?: string;
    capabilities?: string[];
  };
}

/**
 * Constructor interface for model implementations
 */
export interface ModelImplementationConstructor {
  new (providerContext: any, descriptor: ModelDescriptor): ModelImplementation;
}

/**
 * Model descriptor - contains all metadata about a model
 */
export interface ModelDescriptor {
  /** Unique identifier for the model (e.g., "flux", "whisper-stt") */
  modelId: string;
  
  /** Provider that implements this model (e.g., "replicate", "chatterbox-docker") */
  providerId: string;
  
  /** Human-readable name */
  name: string;
  
  /** Description of what the model does */
  description: string;
  
  /** Model version */
  version: string;
  
  /** Input schema definition */
  inputSchema: ModelInputSchema;
  
  /** Output schema definition */
  outputSchema: ModelOutputSchema;
  
  /** Implementation class constructor */
  implementation: ModelImplementationConstructor;
  
  /** Provider-specific configuration */
  providerConfig?: {
    /** API endpoint, container name, etc. */
    endpoint?: string;
    /** Service configuration for Docker providers */
    serviceConfig?: {
      containerName?: string;
      port?: number;
      healthCheckUrl?: string;
      dockerImage?: string;
    };
    /** Parameter mapping between standard and provider-specific */
    parameterMapping?: {
      input?: Record<string, string>;
      output?: Record<string, string>;
    };
  };
  
  /** Optional metadata */
  metadata?: {
    tags?: string[];
    category?: string;
    cost?: {
      inputCost?: number;
      outputCost?: number;
      currency?: string;
    };
    limitations?: string[];
  };
}

/**
 * Provider interface - manages model implementations
 */
export interface Provider {
  /** Unique provider identifier */
  readonly id: string;
  
  /** Human-readable provider name */
  readonly name: string;
  
  /** Provider type */
  readonly type: 'local' | 'remote';
  
  /**
   * Get a model implementation from this provider
   */
  getModel(modelId: string): Promise<ModelImplementation>;
  
  /**
   * Check if provider supports a specific model
   */
  supportsModel(modelId: string): boolean;
  
  /**
   * Get list of models supported by this provider
   */
  getSupportedModels(): string[];
  
  /**
   * Check if provider is available/healthy
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get provider status and information
   */
  getInfo(): {
    id: string;
    name: string;
    type: 'local' | 'remote';
    status: 'available' | 'unavailable' | 'error';
    supportedModels: string[];
  };
}

/**
 * Model Registry interface - central registry for model-provider mappings
 */
export interface ModelRegistry {
  /**
   * Register a model implementation with a provider
   */
  register(descriptor: ModelDescriptor): void;
  
  /**
   * Unregister a model from a provider
   */
  unregister(modelId: string, providerId: string): void;
  
  /**
   * Get model descriptor for a specific provider
   */
  getModelDescriptor(modelId: string, providerId: string): ModelDescriptor | undefined;
  
  /**
   * Get all descriptors for a model across all providers
   */
  getModelDescriptors(modelId: string): ModelDescriptor[];
  
  /**
   * Get all models supported by a provider
   */
  getModelsForProvider(providerId: string): string[];
  
  /**
   * Get all providers that support a model
   */
  getProvidersForModel(modelId: string): string[];
  
  /**
   * Get all registered models
   */
  getAllModels(): string[];
  
  /**
   * Get all registered providers
   */
  getAllProviders(): string[];
  
  /**
   * Find models by capabilities or metadata
   */
  findModels(criteria: {
    inputType?: MediaType;
    outputType?: MediaType;
    category?: string;
    tags?: string[];
    provider?: string;
  }): ModelDescriptor[];
  
  /**
   * Validate a model descriptor before registration
   */
  validateDescriptor(descriptor: ModelDescriptor): {
    valid: boolean;
    errors: string[];
  };
  
  /**
   * Get registry statistics
   */
  getStats(): {
    totalModels: number;
    totalProviders: number;
    modelsByProvider: Record<string, number>;
    providersByType: Record<'local' | 'remote', number>;
  };
}

/**
 * Provider Registry interface - manages provider instances
 */
export interface ProviderRegistry {
  /**
   * Register a provider instance
   */
  register(provider: Provider): void;
  
  /**
   * Unregister a provider
   */
  unregister(providerId: string): void;
  
  /**
   * Get a provider instance
   */
  getProvider(providerId: string): Provider | undefined;
  
  /**
   * Get all registered providers
   */
  getProviders(): Provider[];
  
  /**
   * Find providers by type or capabilities
   */
  findProviders(criteria: {
    type?: 'local' | 'remote';
    supportsModel?: string;
    available?: boolean;
  }): Provider[];
}

/**
 * Error types for the registry system
 */
export class ModelRegistryError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ModelRegistryError';
  }
}

export class ProviderError extends Error {
  constructor(message: string, public providerId: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ModelNotFoundError extends Error {
  constructor(modelId: string, providerId?: string) {
    super(providerId 
      ? `Model '${modelId}' not found for provider '${providerId}'`
      : `Model '${modelId}' not found`
    );
    this.name = 'ModelNotFoundError';
  }
}

export class ProviderNotFoundError extends Error {
  constructor(providerId: string) {
    super(`Provider '${providerId}' not found`);
    this.name = 'ProviderNotFoundError';
  }
}

/**
 * Convenience function type for getting providers
 */
export type GetProviderFunction = (providerId: string) => Provider | undefined;
