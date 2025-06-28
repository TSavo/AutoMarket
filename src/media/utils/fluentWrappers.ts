import { MediaProvider, ProviderModel, FluentTransformOptions, MediaCapability } from '../types/provider';
import { CallableModelType, CallableProviderType } from '../types/provider';

/**
 * Creates a callable model wrapper that allows direct invocation and method chaining.
 * This replaces the functionality of the old FluentModel class.
 */
export function createCallableModel(provider: MediaProvider, modelId: string): CallableModelType {
  const callable = (async (input: any, options?: FluentTransformOptions, useJobSystem: boolean = false) => {
    console.log(`[CallableModel] Transforming with ${provider.name}/${modelId}`);
    console.log(`[CallableModel] Input type: ${input?.constructor?.name}`);
    console.log(`[CallableModel] Options:`, options);

    // Get the actual model instance (provider's getModel method handles discovery)
    const modelInstance = await provider.getModel(modelId);
    if (!modelInstance) {
      throw new Error(`Model '${modelId}' not found in provider '${provider.name}'.`);
    }

    // Call the model's transform method directly
    return await modelInstance.transform(input, options);
  }) as CallableModelType;

  // Add additional methods to the callable function
  callable.transform = callable; // 'transform' method is the same as direct invocation

  callable.getModelInfo = () => {
    const modelInfo = provider.models.find(m => m.id === modelId);
    return {
      providerId: provider.id,
      modelId: modelId,
      capabilities: modelInfo?.capabilities || []
    };
  };

  return callable;
}

/**
 * Creates a callable provider wrapper that allows direct model selection and method chaining.
 * This replaces the functionality of the old FluentProvider class.
 */
export function createCallableProvider(provider: MediaProvider): CallableProviderType {
  const callable = (async (modelId: string) => {
    // Check if provider is available
    const isAvailable = await provider.isAvailable();
    if (!isAvailable) {
      console.warn(`[CallableProvider] Provider '${provider.id}' may not be available`);
    }
    return createCallableModel(provider, modelId);
  }) as CallableProviderType;

  // Add additional methods to the callable function
  callable.model = callable; // 'model' method is the same as direct invocation

  callable.getProviderInfo = () => {
    return {
      id: provider.id,
      type: provider.type,
      isAvailable: provider.isAvailable(), // This returns a promise, which is fine for info
      models: provider.models.map(m => ({
        id: m.id,
        name: m.name,
        capabilities: m.capabilities,
        parameters: m.parameters || {} // Ensure parameters are included
      }))
    };
  };

  return callable;
}
