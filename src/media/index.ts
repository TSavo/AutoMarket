/**
 * Prizm SDK - Media Transformation SDK
 * Unified access to 15+ AI providers through clean provider→model→transform architecture
 */

// Export Core SDK Components
export { ProviderRegistry } from './registry/ProviderRegistry';
export * from './registry/bootstrap';

// Export Fluent API (Layer 2)
import { ProviderRegistry } from './registry/ProviderRegistry';
import { initializeProviders } from './registry/bootstrap';
import { createCallableProvider } from './utils/fluentWrappers';
import { CallableProviderType } from './types/provider';

/**
 * Main factory function for fluent API with direct call syntax
 * 
 * Usage patterns:
 * - Traditional: await $("openrouter").model("model-id").transform(input, options)
 * - Direct call: await $("openrouter")("model-id")(input, options)
 * - Pipeline ready: const model = $("openrouter")("model-id"); await model(input, options)
 */
export async function $(providerId: string): Promise<CallableProviderType> {
  const registry = ProviderRegistry.getInstance();
  
  // Ensure registry is initialized
  if (!registry.hasProvider(providerId)) {
    await initializeProviders();
  }

  if (!registry.hasProvider(providerId)) {
    throw new Error(`Provider '${providerId}' not found. Available providers: ${registry.getAvailableProviders().join(', ')}`);
  }

  const provider = await registry.getProvider(providerId);
  
  return createCallableProvider(provider);
}

// Export default as $ for convenient usage
export default $;

/**
 * Enhanced fluent API factory function with single await pattern
 * 
 * This version chains all async operations internally, allowing for clean single-await syntax:
 * 
 * Usage patterns:
 * - Single await: await $("provider")("model")(input, options)
 * - Store chain: const chain = $("provider")("model"); await chain(input, options)
 */
export function $$(providerId: string): (modelId: string) => (input: any, options?: any) => Promise<any> {
  return (modelId: string) => {
    return (input: any, options?: any) => {
      // Chain all async operations internally
      return (async () => {
        const registry = ProviderRegistry.getInstance();
        
        // Ensure registry is initialized
        if (!registry.hasProvider(providerId)) {
          await initializeProviders();
        }

        if (!registry.hasProvider(providerId)) {
          throw new Error(`Provider '${providerId}' not found. Available providers: ${registry.getAvailableProviders().join(', ')}`);
        }

        const provider = await registry.getProvider(providerId);
        
        // Check if provider is available
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          console.warn(`[FluentAPI] Provider '${providerId}' may not be available`);
        }
        
        // Get the model
        const model = await provider.getModel(modelId);
        if (!model) {
          throw new Error(`Model '${modelId}' not found in provider '${providerId}'.`);
        }
        
        // Execute transform
        return await model.transform(input, options);
      })();
    };
  };
}



// Export Smart Asset Loading System (Layer 5)
export { SmartAssetFactory, AssetLoader } from './assets/SmartAssetFactory';

// Export Asset system
export { BaseAsset } from './assets/Asset';

// Export Role-based media types
export {
  Audio,
  Video,
  Text,
  Image
} from './assets/roles';

// Export Role-based media type formats
export type {
  AudioFormat,
  VideoFormat,
  AudioMetadata,
  VideoMetadata,
  TextMetadata,
  ImageMetadata,
  ImageFormat
} from './assets/roles';

// Export Role interfaces
export type {
  AudioRole,
  VideoRole,
  TextRole,
  ImageRole,
  AnyRole,
  AnyMedia
} from './assets/roles';

// Export Role type guards
export {
  hasAudioRole,
  hasVideoRole,
  hasTextRole,
  hasImageRole
} from './assets/roles';


// Export Provider Capabilities (what providers can do)
export type {
  AudioToTextProvider,
  TextToAudioProvider,
  TextToImageProvider,
  TextToVideoProvider,
  TextToTextProvider,
  VideoToAudioProvider,
  VideoToVideoProvider,
  ServiceManagement
} from './capabilities';

// Export Provider Capability Guards
export {
  hasAudioToTextRole,
  hasTextToAudioRole,
  hasTextToImageRole,
  hasTextToVideoRole,
  hasTextToTextRole,
  hasVideoToAudioRole,
  hasVideoToVideoRole,
  getProviderRoles
} from './capabilities';

// Export Provider Packages (provider-centric organization)
export * from './providers';



// Ingest types excluded from Vercel deployment
// Available in development only

// Composition services excluded from Vercel deployment
// Available in development only
