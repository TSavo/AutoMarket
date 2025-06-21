/**
 * TextToVideoMixin
 * 
 * Mixin to add TextToVideoProvider capabilities to a provider class.
 * This mixin enables providers to support text-to-video generation models,
 * allowing them to create video content from text prompts using various AI models.
 * 
 * The mixin implements the TextToVideoProvider interface and provides intelligent
 * delegation to base provider methods, with fallback mechanisms for maximum
 * compatibility across different provider implementations.
 * 
 * ## Features
 * - **Model Creation**: Create TextToVideoModel instances from model IDs
 * - **Model Discovery**: Filter and identify text-to-video capable models
 * - **Intelligent Delegation**: Prefers base class implementations when available
 * - **Fallback Support**: Graceful degradation to generic model creation
 * - **Pattern Matching**: Automatic identification of video generation models
 * - **Type Safety**: Full TypeScript support with proper type checking
 * 
 * ## Supported Model Patterns
 * The mixin automatically identifies text-to-video models by checking for these patterns:
 * - `video` - General video generation models
 * - `runway` - Runway ML models (Gen1, Gen2, Gen3)
 * - `stable-video` - Stable Video Diffusion models
 * - `luma` - Luma Dream Machine models
 * - `pika` - Pika Labs models
 * - `gen-` - Generation models (Gen1, Gen2, etc.)
 * - `dream-machine` - Dream Machine variants
 * 
 * @example Basic Usage
 * ```typescript
 * class MyProvider extends withTextToVideoProvider(BaseProvider) {
 *   // Provider now has TextToVideoProvider capabilities
 * }
 * 
 * const provider = new MyProvider();
 * const model = await provider.createTextToVideoModel('runway-gen3');
 * const prompt = Text.fromString("A cat playing in a sunny garden");
 * const video = await model.transform(prompt, { duration: 5 });
 * ```
 * 
 * @example Advanced Usage with Custom Models
 * ```typescript
 * class CustomVideoProvider extends withTextToVideoProvider(BaseProvider) {
 *   // Override to add custom logic
 *   async createTextToVideoModel(modelId: string) {
 *     if (modelId === 'my-custom-model') {
 *       return new MyCustomVideoModel();
 *     }
 *     return super.createTextToVideoModel(modelId);
 *   }
 * }
 * ```
 */

import { TextToVideoModel } from '../../models/abstracts/TextToVideoModel';
import { TextToVideoProvider } from '../interfaces/TextToVideoProvider';

/**
 * Constructor type for mixin functions
 */
export type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Add TextToVideoProvider capabilities to a provider class.
 * 
 * This mixin adds text-to-video generation capabilities to any provider class,
 * enabling it to create and manage TextToVideoModel instances. The mixin uses
 * intelligent delegation, preferring base class implementations when available
 * and falling back to generic model creation when needed.
 * 
 * @param Base - The base provider class to extend
 * @returns Extended class with TextToVideoProvider capabilities
 */
export function withTextToVideoProvider<T extends Constructor>(Base: T) {
  return class extends Base implements TextToVideoProvider {
    /**
     * Create a TextToVideoModel instance for the specified model ID.
     * 
     * This method uses intelligent delegation to prefer base class implementations
     * when available, ensuring compatibility with existing provider architectures.
     * If no base implementation exists, it falls back to the generic getModel method.
     * 
     * @param modelId - The ID of the text-to-video model to create
     * @returns Promise resolving to a TextToVideoModel instance
     * @throws Error if the model is not supported or not a TextToVideoModel
     * 
     * @example
     * ```typescript
     * const model = await provider.createTextToVideoModel('runway-gen3');
     * const video = await model.transform(textPrompt, { duration: 10 });
     * ```
     */
    async createTextToVideoModel(modelId: string): Promise<TextToVideoModel> {
      // Check if this instance has a direct createTextToVideoModel method (before mixin)
      const baseMethod = (this as any).__proto__.__proto__.createTextToVideoModel;
      if (baseMethod && typeof baseMethod === 'function') {
        console.log('[withTextToVideoProvider] Using base class implementation');
        return await baseMethod.call(this, modelId);
      }
      
      console.log('[withTextToVideoProvider] Using fallback getModel implementation');
      // Fallback: delegate to base provider's getModel method
      const model = await (this as any).getModel(modelId);
      
      // Validate that the returned model is a TextToVideoModel
      if (!(model instanceof TextToVideoModel)) {
        throw new Error(`Model '${modelId}' is not a TextToVideoModel`);
      }
      
      return model;
    }
    
    /**
     * Get all supported text-to-video model IDs.
     * 
     * Filters the base provider's supported models to only include those
     * that are capable of text-to-video generation. Uses pattern matching
     * to identify video generation models from their names.
     * 
     * @returns Array of supported text-to-video model IDs
     * 
     * @example
     * ```typescript
     * const videoModels = provider.getSupportedTextToVideoModels();
     * console.log(videoModels); // ['runway-gen3', 'luma-dream-machine', 'stable-video']
     * ```
     */
    getSupportedTextToVideoModels(): string[] {
      // Filter supported models to only text-to-video models
      const allModels = (this as any).getSupportedModels();
      return allModels.filter((modelId: string) => 
        modelId.includes('video') || 
        modelId.includes('runway') || 
        modelId.includes('stable-video') || 
        modelId.includes('luma') || 
        modelId.includes('pika') ||
        modelId.includes('gen-') ||
        modelId.includes('dream-machine') ||
        modelId.includes('text-to-video')
      );
    }
    
    /**
     * Check if a specific text-to-video model is supported.
     * 
     * @param modelId - The model ID to check
     * @returns True if the model is supported for text-to-video generation
     * 
     * @example
     * ```typescript
     * if (provider.supportsTextToVideoModel('runway-gen3')) {
     *   const model = await provider.createTextToVideoModel('runway-gen3');
     *   // Use the model...
     * }
     * ```
     */
    supportsTextToVideoModel(modelId: string): boolean {
      return this.getSupportedTextToVideoModels().includes(modelId);
    }
  };
}
