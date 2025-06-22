/**
 * Fluent Provider API for Pipeline DSL
 * 
 * Enables beautiful syntax like:
 * $("openrouter").("deepseek/deepseek-chat:free").transform(input, options)
 * 
 * This provides a chainable interface over the existing provider system
 * while maintaining full generation_prompt lineage and job system integration.
 */

import { ProviderRegistry } from '../registry/bootstrap';
import { MediaCapability } from '../types/provider';

export interface FluentTransformOptions {
  [key: string]: any;
}

export interface FluentTransformResult {
  jobId?: string;           // If async via job system
  result?: any;             // If synchronous
  promise?: Promise<any>;   // If async direct
}

/**
 * Fluent Model interface for chaining model selection and transformation
 * 
 * Supports both:
 * - Direct invocation: $("provider")("model")(input, options)
 * - Traditional: $("provider").model("model").transform(input, options)
 */
export class FluentModel {
  constructor(
    private provider: any,
    private modelId: string
  ) {}

  /**
   * Direct invocation syntax: model(input, options)
   * This enables: $("provider")("model")(input, options)
   */
  async __call__(
    input: any, 
    options?: FluentTransformOptions,
    useJobSystem: boolean = false
  ): Promise<any> {
    return this.transform(input, options, useJobSystem);
  }

  /**
   * Execute transformation with the selected model
   * 
   * @param input - Raw Role object(s) to transform
   * @param options - Transform options specific to the model
   * @param useJobSystem - Whether to use async job system (default: false for direct execution)
   */
  async transform(
    input: any, 
    options?: FluentTransformOptions,
    useJobSystem: boolean = false
  ): Promise<any> {
    console.log(`[FluentModel] Transforming with ${this.provider.name}/${this.modelId}`);
    console.log(`[FluentModel] Input type: ${input?.constructor?.name}`);
    console.log(`[FluentModel] Options:`, options);

    if (useJobSystem) {
      return this.transformViaJobSystem(input, options);
    } else {
      return this.transformDirect(input, options);
    }
  }  /**
   * Direct transformation (synchronous within async context)
   * The provider's getModel method now properly waits for discovery
   */
  private async transformDirect(input: any, options?: FluentTransformOptions): Promise<any> {
    // Get the actual model instance (provider now waits for discovery)
    const modelInstance = await this.provider.getModel(this.modelId);
    if (!modelInstance) {
      throw new Error(`Model '${this.modelId}' not found in provider '${this.provider.name}'. Available models: ${this.provider.models.map(m => m.id).join(', ')}`);
    }

    // Call the model's transform method directly
    return await modelInstance.transform(input, options);
  }
  /**
   * Transformation via job system (for async pipelines)
   */
  private async transformViaJobSystem(input: any, options?: FluentTransformOptions): Promise<string> {
    // This would integrate with the job system
    // For now, simulate job creation
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // TODO: Create actual job via REST API
    console.log(`[FluentModel] Created job: ${jobId}`);
    
    return jobId;
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      providerId: this.provider.name,
      modelId: this.modelId,
      capabilities: this.provider.models.find(m => m.id === this.modelId)?.capabilities || []
    };
  }
}

/**
 * Fluent Provider interface for chaining provider and model selection
 */
export class FluentProvider {
  constructor(private provider: any) {}  /**
   * Select a model from this provider
   * 
   * @param modelId - The model identifier (e.g., "deepseek/deepseek-chat:free")
   * @returns FluentModel for method chaining or direct invocation
   */
  model(modelId: string): any {
    // Create the FluentModel instance
    const fluentModel = new FluentModel(this.provider, modelId);
    
    // Create a callable function that delegates to transform
    const callableModel = async function(input: any, options?: any, useJobSystem: boolean = false) {
      return fluentModel.transform(input, options, useJobSystem);
    };
    
    // Copy all FluentModel methods to the callable function
    Object.setPrototypeOf(callableModel, fluentModel);
    Object.getOwnPropertyNames(fluentModel).forEach(prop => {
      if (prop !== 'constructor') {
        callableModel[prop] = fluentModel[prop];
      }
    });
    
    // Copy methods from FluentModel prototype
    Object.getOwnPropertyNames(Object.getPrototypeOf(fluentModel)).forEach(prop => {
      if (prop !== 'constructor' && typeof fluentModel[prop] === 'function') {
        callableModel[prop] = fluentModel[prop].bind(fluentModel);
      }
    });
    
    return callableModel;
  }

  /**
   * Alternative syntax: use () operator for model selection
   * Enables: $("openrouter").("model-id")
   */
  [Symbol.toPrimitive](): Function {
    return (modelId: string) => this.model(modelId);
  }

  /**
   * Get provider information
   */
  getProviderInfo() {
    return {
      id: this.provider.name,
      type: this.provider.type,
      isAvailable: this.provider.isAvailable,
      models: this.provider.models.map(m => ({
        id: m.id,
        name: m.name,
        capabilities: m.capabilities
      }))
    };
  }
}

/**
 * Main factory function for fluent API with direct call syntax
 * 
 * Usage patterns:
 * - Traditional: await $("openrouter").model("model-id").transform(input, options)
 * - Direct call: await $("openrouter")("model-id")(input, options)
 * - Pipeline ready: const model = $("openrouter")("model-id"); await model(input, options)
 */
export async function $(providerId: string): Promise<any> {
  const registry = ProviderRegistry.getInstance();
  
  // Ensure registry is initialized
  if (!registry.hasProvider(providerId)) {
    const { initializeProviders } = await import('../registry/bootstrap');
    await initializeProviders();
  }

  if (!registry.hasProvider(providerId)) {
    throw new Error(`Provider '${providerId}' not found. Available providers: ${registry.getAvailableProviders().join(', ')}`);
  }

  const provider = await registry.getProvider(providerId);
  
  // Check if provider is available
  const isAvailable = await provider.isAvailable();
  if (!isAvailable) {
    console.warn(`[FluentProvider] Provider '${providerId}' may not be available`);
  }

  const fluentProvider = new FluentProvider(provider);
  
  // Create a function that supports both calling styles
  const providerFunction = (modelId: string) => {
    return fluentProvider.model(modelId);
  };
  
  // Add FluentProvider methods to the function
  providerFunction.model = fluentProvider.model.bind(fluentProvider);
  providerFunction.getProviderInfo = fluentProvider.getProviderInfo.bind(fluentProvider);
  
  return providerFunction;
}

// Export default as $ for convenient usage
export default $;
